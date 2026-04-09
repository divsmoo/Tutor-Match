from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import pika
import json
import os
import uuid

from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = 5013

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

TRIALS_SERVICE_URL  = "http://trials:5004"
STUDENT_SERVICE_URL = "http://student:5002"
TUTOR_SERVICE_URL   = "http://tutor:5001"

PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "https://personal-tiwkqptq.outsystemscloud.com/PaymentCore/rest/CreatePaymentAPI/payments")
CREDIT_SERVICE_URL  = os.environ.get("CREDIT_SERVICE_URL", "http://credit:5007")


# ── Helpers ───────────────────────────────────

def publish_event(queue_name: str, message: dict):
    """Publish a message to a RabbitMQ queue."""
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2),
        )
        connection.close()
        print(f"[make-trial-booking] Published to {queue_name}: {message}")
    except Exception as e:
        print(f"[make-trial-booking] RabbitMQ publish error: {e}")
        raise


def update_trial_status(trial_id: int, status: str, extra: dict = None):
    """PUT trial status (and any extra fields) to the Trials service."""
    payload = {"status": status, **(extra or {})}
    return requests.put(f"{TRIALS_SERVICE_URL}/trials/{trial_id}", json=payload)


def fetch_tutor(tutor_id: int) -> dict:
    """Fetch tutor details; raises ValueError on failure."""
    resp = requests.get(f"{TUTOR_SERVICE_URL}/tutor/{tutor_id}")
    if resp.status_code != 200:
        raise ValueError("Failed to fetch tutor details")
    return resp.json().get("data", resp.json())


def calc_hours(start_time: str, end_time: str) -> float:
    """Return duration in hours between two HH:MM:SS or HH:MM strings."""
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            s = datetime.strptime(start_time, fmt)
            e = datetime.strptime(end_time, fmt)
            return max((e - s).seconds / 3600.0, 0)
        except ValueError:
            continue
    return 1.0  # fallback


def fetch_student(student_id: int) -> dict:
    """Fetch student details; raises ValueError on failure."""
    resp = requests.get(f"{STUDENT_SERVICE_URL}/student/{student_id}")
    if resp.status_code != 200:
        raise ValueError("Failed to fetch student details")
    return resp.json().get("data", resp.json())


# ── Routes ────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "make-trial-booking", "status": "running"}), 200


@app.route("/initiate-payment", methods=["POST"])
def initiate_payment():
    """
    Step 1 of 2: Create a Stripe PaymentIntent via OutSystems.

    Expected JSON body:
        { "student_id": 1, "tutor_id": 2, "trial_id": 3 }

    Flow:
        1. Validate request.
        2. Fetch tutor rate.
        3. Mark trial as PENDING_PAYMENT.
        4. Call OutSystems to create PaymentIntent.
        5. Return { client_secret, payment_id, amount, currency } to frontend.

    The frontend then uses Stripe.js to confirm the card payment with the client_secret.
    After Stripe confirms, the frontend calls /confirm-booking to finalise the trial.
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        missing = [f for f in ["student_id", "tutor_id", "trial_id"] if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400

        trial_id = data["trial_id"]
        tutor_id = data["tutor_id"]

        # Fetch tutor rate and calculate amount from duration in request
        tutor = fetch_tutor(tutor_id)
        tutor_rate = tutor.get("rate")
        if tutor_rate is None:
            return jsonify({"error": "Tutor rate not found"}), 500

        hours = calc_hours(data.get("start_time", ""), data.get("end_time", ""))
        total_amount = round(tutor_rate * hours, 2)
        total_cents  = int(total_amount * 100)

        # Mark trial as PENDING_PAYMENT
        update_trial_status(trial_id, "PENDING_PAYMENT")

        # Create PaymentIntent via OutSystems
        payment_response = requests.post(
            PAYMENT_SERVICE_URL,
            json={"OrderId": str(uuid.uuid4()), "Amount": total_cents, "Currency": "sgd"},
            headers={"Content-Type": "application/json"},
        )

        if payment_response.status_code != 200:
            update_trial_status(trial_id, "PENDING")  # revert
            try:
                error_detail = payment_response.json().get("ErrorMessage", "Unknown error")
            except Exception:
                error_detail = payment_response.text or "Unknown error"
            return jsonify({"error": "Failed to create payment", "details": error_detail}), 402

        payment_data = payment_response.json()
        client_secret = payment_data.get("ClientSecret")
        payment_id    = payment_data.get("PaymentId")

        if not client_secret:
            update_trial_status(trial_id, "PENDING")  # revert
            return jsonify({"error": "No client secret returned from payment service"}), 500

        return jsonify({
            "client_secret": client_secret,
            "payment_id":    payment_id,
            "amount":        total_amount,
            "amount_cents":  total_cents,
            "currency":      "sgd",
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        print(f"[make-trial-booking] initiate-payment error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route("/confirm-booking", methods=["POST"])
def confirm_booking():
    """
    Step 2 of 2: Called by the frontend AFTER Stripe has successfully charged the card.

    Expected JSON body:
        { "trial_id": 3, "student_id": 1, "tutor_id": 2,
          "trial_date": "2025-06-01", "start_time": "10:00:00", "end_time": "11:00:00",
          "payment_intent_id": "pi_..." }

    Flow:
        1. Mark trial as CONFIRMED.
        2. Fetch student/tutor emails.
        3. Publish LessonConfirmed event to RabbitMQ.
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        required = ["trial_id", "student_id", "tutor_id", "trial_date", "start_time", "end_time"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400

        trial_id          = data["trial_id"]
        student_id        = data["student_id"]
        tutor_id          = data["tutor_id"]
        trial_date        = data["trial_date"]
        start_time        = data["start_time"]
        end_time          = data["end_time"]
        payment_intent_id = data.get("payment_intent_id", "")

        # Confirm the trial
        confirm_resp = update_trial_status(
            trial_id, "CONFIRMED",
            extra={"trial_date": trial_date, "start_time": start_time, "end_time": end_time},
        )
        if confirm_resp.status_code != 200:
            return jsonify({"error": "Failed to confirm trial booking"}), 500

        # Fetch emails and tutor rate for notification
        student = fetch_student(student_id)
        tutor   = fetch_tutor(tutor_id)
        student_email = student.get("details", {}).get("studentEmail")
        tutor_email   = tutor.get("contact_info")
        tutor_rate    = tutor.get("rate")

        # Deduct credits from student wallet (rate × duration)
        try:
            hours = calc_hours(start_time, end_time)
            total_amount = round(tutor_rate * hours, 2)
            deduct_mutation = """
                mutation {
                    deductCredits(studentId: %d, amount: %f) {
                        studentId
                        balance
                    }
                }
            """ % (student_id, total_amount)
            requests.post(
                f"{CREDIT_SERVICE_URL}/graphql",
                json={"query": deduct_mutation},
                headers={"Content-Type": "application/json"},
                timeout=5,
            )
        except Exception as e:
            print(f"[make-trial-booking] Credit deduction failed (non-fatal): {e}")

        if student_email and tutor_email:
            publish_event("LessonConfirmed", {
                "trial_id":          trial_id,
                "tutor_id":          tutor_id,
                "student_id":        student_id,
                "student_email":     student_email,
                "tutor_email":       tutor_email,
                "confirmed_date":    trial_date,
                "start_time":        start_time,
                "end_time":          end_time,
                "amount":            tutor_rate,
                "currency":          "sgd",
                "payment_intent_id": payment_intent_id,
            })
        else:
            print(f"[make-trial-booking] Warning: missing emails for trial {trial_id}, skipping notification")

        return jsonify({
            "message":           "Trial booking confirmed successfully. Tutor will be notified.",
            "trial_id":          trial_id,
            "payment_intent_id": payment_intent_id,
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        print(f"[make-trial-booking] confirm-booking error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route("/make-trial-booking", methods=["POST"])
def make_trial_booking():
    """
    Legacy single-step endpoint (kept for backward compatibility).
    Prefer /initiate-payment + /confirm-booking for real card charging.
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        required = ["student_id", "tutor_id", "trial_date", "start_time", "end_time", "trial_id"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400

        student_id = data["student_id"]
        tutor_id   = data["tutor_id"]
        trial_id   = data["trial_id"]
        trial_date = data["trial_date"]
        start_time = data["start_time"]
        end_time   = data["end_time"]

        tutor = fetch_tutor(tutor_id)
        tutor_rate = tutor.get("rate")
        if tutor_rate is None:
            return jsonify({"error": "Tutor rate not found"}), 500
        tutor_rate_cents = int(tutor_rate * 100)

        update_trial_status(trial_id, "PENDING_PAYMENT")

        payment_response = requests.post(
            PAYMENT_SERVICE_URL,
            json={"OrderId": str(uuid.uuid4()), "Amount": tutor_rate_cents, "Currency": "sgd"},
            headers={"Content-Type": "application/json"},
        )

        if payment_response.status_code != 200:
            update_trial_status(trial_id, "CANCELLED")
            try:
                error_detail = payment_response.json().get("ErrorMessage", "Unknown error")
            except Exception:
                error_detail = payment_response.text or "Unknown error"
            return jsonify({"error": "Payment failed", "details": error_detail}), 402

        confirm_resp = update_trial_status(
            trial_id, "CONFIRMED",
            extra={"trial_date": trial_date, "start_time": start_time, "end_time": end_time},
        )
        if confirm_resp.status_code != 200:
            return jsonify({"error": "Failed to confirm trial booking"}), 500

        student_email = fetch_student(student_id).get("details", {}).get("studentEmail")
        tutor_email   = fetch_tutor(tutor_id).get("contact_info")

        if not student_email or not tutor_email:
            return jsonify({"error": "Could not retrieve email addresses for notification"}), 500

        publish_event("LessonConfirmed", {
            "trial_id":       trial_id,
            "tutor_id":       tutor_id,
            "student_id":     student_id,
            "student_email":  student_email,
            "tutor_email":    tutor_email,
            "confirmed_date": trial_date,
            "start_time":     start_time,
            "end_time":       end_time,
            "amount":         tutor_rate,
            "currency":       "sgd",
        })

        return jsonify({
            "message":  "Trial booking confirmed successfully. Tutor will be notified.",
            "trial_id": trial_id,
            "amount":   tutor_rate,
            "currency": "sgd",
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        print(f"[make-trial-booking] Unexpected error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
