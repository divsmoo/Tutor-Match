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

# Atomic service URLs (Docker service names)
TRIALS_SERVICE_URL = "http://trials:5004"
STUDENT_SERVICE_URL = "http://student:5002"
TUTOR_SERVICE_URL = "http://tutor:5001"
TRIAL_LESSON_FEE = 40  # flat fee in SGD

# OutSystems Payment service — set PAYMENT_SERVICE_URL in your .env or Docker environment
PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://localhost/payment-placeholder")


# ── Publish to RabbitMQ helper ────────────────
def publish_event(queue_name, message: dict):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)  # make message persistent
        )
        connection.close()
        print(f"[make-trial-booking] Published to {queue_name}: {message}")
    except Exception as e:
        print(f"[make-trial-booking] RabbitMQ publish error: {e}")


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "make-trial-booking", "status": "running"}), 200


# ── POST — Student confirms a trial booking ──────────────
# Tutor has already proposed available timeslots; student selects one in the UI.
# Expected body: { "student_id": 1, "tutor_id": 2, "trial_date": "2025-06-01", "start_time": "10:00:00", "end_time": "11:00:00", "trial_id": 3 }
@app.route("/make-trial-booking", methods=["POST"])
def make_trial_booking():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        tutor_id = data.get("tutor_id")
        trial_date = data.get("trial_date")
        start_time = data.get("start_time")
        end_time = data.get("end_time")
        trial_id = data.get("trial_id")
 
        if not all([student_id, tutor_id, trial_date, start_time, end_time, trial_id]):
            return jsonify({"error": "Missing (one of more) required fields: student_id, tutor_id, trial_date, start_time, end_time, trial_id"}), 400

        # Step 1 — Get trial lesson fee from tutor -> rate
        tutor_response = requests.get(f"{TUTOR_SERVICE_URL}/tutor/{tutor_id}")
        if tutor_response.status_code != 200:
            return jsonify({"error": "Failed to fetch tutor details"}), 500
        tutor = tutor_response.json().get("data", tutor_response.json())
        tutor_rate = tutor.get("rate")
        tutor_rate_cents = int(tutor_rate*100)
        
        
        # Step 2 — Set booking status to PENDING_PAYMENT (OPTIONAL)
        requests.put(
            f"{TRIALS_SERVICE_URL}/trials/{trial_id}",
            json={"status": "PENDING_PAYMENT"}
        )

        # Step 3 — Call OutSystems Payment Service
        order_id = str(uuid.uuid4())
        payment_payload = {
            "OrderId": order_id,
            "Amount": tutor_rate_cents,
            "Currency": "sgd"
        }
        
        headers = {"Content-Type": "application/json"}

        payment_response = requests.post(PAYMENT_SERVICE_URL, json=payment_payload, headers=headers)
        if payment_response.status_code != 200:
            # Payment failed — cancel the booking
            requests.put(
                f"{TRIALS_SERVICE_URL}/trials/{trial_id}",
                json={"status": "CANCELLED"}
            )
            payment_result = payment_response.json()
            return jsonify({
                "error": "Payment failed",
                "details": payment_result.get("ErrorMessage", "Unknown error")
            }), 402
        payment_result = payment_response.json()
        print("pass payment stage")


        # Step 4 — PUT Trials Service to update trial status to CONFIRMED
        trials_response = requests.put(
            f"{TRIALS_SERVICE_URL}/trials/{trial_id}",
            json={"status": "CONFIRMED", "trial_date": trial_date, "start_time": start_time, "end_time": end_time}
        )
        if trials_response.status_code != 200:
            return jsonify({"error": "Failed to confirm trial booking"}), 500

        # Step 5 — Fetch student and tutor emails for notification
        student_response = requests.get(f"{STUDENT_SERVICE_URL}/student/{student_id}")
        if student_response.status_code != 200:
            return jsonify({"error": "Failed to fetch student details"}), 500
        student_data = student_response.json().get("data", student_response.json())
        details = student_data.get("details", {})
        student_email = details.get("studentEmail")

        tutor_response = requests.get(f"{TUTOR_SERVICE_URL}/tutor/{tutor_id}")
        if tutor_response.status_code != 200:
            return jsonify({"error": "Failed to fetch tutor details"}), 500
        tutor = tutor_response.json().get("data", tutor_response.json())
        tutor_email = tutor.get("contact_info")

        if not student_email or not tutor_email:
            return jsonify({"error": "Could not retrieve email addresses for notification"}), 500

        # Step 6 — Publish LessonConfirmed event to RabbitMQ
        # Notification service will pick this up and notify both parties
        publish_event("LessonConfirmed", {
            "trial_id": trial_id,
            "tutor_id": tutor_id,
            "student_id": student_id,
            "student_email": student_email,
            "tutor_email": tutor_email,
            "confirmed_date": trial_date,
            "start_time": start_time,
            "end_time": end_time,
            # "payment_id": payment_result.get("PaymentId"),
            # "stripe_payment_intent_id": payment_result.get("StripePaymentIntentId"),
            "amount": tutor_rate,
            "currency": "sgd"
        })
        return jsonify({
            "message": "Trial booking confirmed successfully. Tutor will be notified.",
            "trial_id": trial_id,
            # "payment_id": payment_result.get("PaymentId"),
            "amount": tutor_rate,
            "currency": "sgd"
        }), 200

    # return 500 for unexpected server errors
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)