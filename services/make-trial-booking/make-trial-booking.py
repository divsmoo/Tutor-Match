from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import pika
import json
import os
import uuid

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = 5013

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

TRIALS_SERVICE_URL  = "http://trials:5004"
STUDENT_SERVICE_URL = "http://student:5002"
TUTOR_SERVICE_URL   = "http://tutor:5001"

PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://localhost/payment-placeholder")

REQUIRED_FIELDS = ["student_id", "tutor_id", "trial_date", "start_time", "end_time", "trial_id"]


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
        raise  # let the caller handle it


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


@app.route("/make-trial-booking", methods=["POST"])
def make_trial_booking():
    """
    Confirm a trial booking after the student selects a proposed timeslot.

    Expected JSON body:
        { "student_id": 1, "tutor_id": 2, "trial_id": 3,
          "trial_date": "2025-06-01", "start_time": "10:00:00", "end_time": "11:00:00" }

    Flow:
        1. Validate request body.
        2. Fetch tutor rate.
        3. Mark trial as PENDING_PAYMENT.
        4. Process payment via OutSystems.
        5. Confirm (or cancel) the trial.
        6. Fetch student/tutor emails.
        7. Publish LessonConfirmed event to RabbitMQ.
    """
    try:
        data = request.get_json(silent=True)

        # ── 1. Validate input ────────────────────
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        missing = [f for f in REQUIRED_FIELDS if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400

        student_id = data["student_id"]
        tutor_id   = data["tutor_id"]
        trial_id   = data["trial_id"]
        trial_date = data["trial_date"]
        start_time = data["start_time"]
        end_time   = data["end_time"]

        # ── 2. Fetch tutor rate ──────────────────
        tutor = fetch_tutor(tutor_id)
        tutor_rate = tutor.get("rate")
        if tutor_rate is None:
            return jsonify({"error": "Tutor rate not found"}), 500
        tutor_rate_cents = int(tutor_rate * 100)

        # ── 3. Mark trial as PENDING_PAYMENT ────
        update_trial_status(trial_id, "PENDING_PAYMENT")

        # ── 4. Process payment ───────────────────
        payment_response = requests.post(
            PAYMENT_SERVICE_URL,
            json={"OrderId": str(uuid.uuid4()), "Amount": tutor_rate_cents, "Currency": "sgd"},
            headers={"Content-Type": "application/json"},
        )

        if payment_response.status_code != 200:
            update_trial_status(trial_id, "CANCELLED")
            error_detail = payment_response.json().get("ErrorMessage", "Unknown error")
            return jsonify({"error": "Payment failed", "details": error_detail}), 402

        # ── 5. Confirm the trial ─────────────────
        confirm_resp = update_trial_status(
            trial_id, "CONFIRMED",
            extra={"trial_date": trial_date, "start_time": start_time, "end_time": end_time},
        )
        if confirm_resp.status_code != 200:
            return jsonify({"error": "Failed to confirm trial booking"}), 500

        # ── 6. Fetch emails ──────────────────────
        student_email = fetch_student(student_id).get("details", {}).get("studentEmail")
        tutor_email   = fetch_tutor(tutor_id).get("contact_info")

        if not student_email or not tutor_email:
            return jsonify({"error": "Could not retrieve email addresses for notification"}), 500

        # ── 7. Publish LessonConfirmed event ─────
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
        # Raised by fetch_tutor / fetch_student for upstream HTTP failures
        return jsonify({"error": str(e)}), 502

    except Exception as e:
        print(f"[make-trial-booking] Unexpected error: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)