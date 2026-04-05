from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests as http
import pika
import json
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = 5013

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

# Atomic service URLs (Docker service names)
BOOKING_SERVICE_URL = "http://booking:5004"

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
# Expected body: { "student_id": 1, "tutor_id": 2, "timeslot": "2025-06-01T10:00:00", "trial_id": 3 }
@app.route("/make-trial-booking", methods=["POST"])
def make_trial_booking():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        tutor_id = data.get("tutor_id")
        timeslot = data.get("timeslot")
        trial_id = data.get("trial_id")

        if not all([student_id, tutor_id, timeslot, trial_id]):
            return jsonify({"error": "Missing required fields: student_id, tutor_id, timeslot, trial_id"}), 400

        # Step 1 — Call OutSystems Payment Service to process payment
        # TODO: confirm exact endpoint path and payload fields with OutSystems team
        payment_payload = {
            "student_id": student_id,
            "tutor_id": tutor_id,
            "trial_id": trial_id
        }
        payment_response = http.post(PAYMENT_SERVICE_URL, json=payment_payload)
        if payment_response.status_code != 200:
            return jsonify({"error": "Payment failed"}), 402

        # Step 2 — PATCH Booking Service to update trial status from PENDING to CONFIRMED
        booking_response = http.patch(
            f"{BOOKING_SERVICE_URL}/booking/{trial_id}",
            json={"status": "CONFIRMED", "timeslot": timeslot}
        )
        if booking_response.status_code != 200:
            return jsonify({"error": "Failed to confirm booking"}), 500
        booking = booking_response.json()["data"][0]

        # Step 3 — Publish BookingConfirmed event to RabbitMQ
        # Notification service will pick this up and notify the tutor
        publish_event("BookingConfirmed", {
            "booking_id": booking["id"],
            "trial_id": trial_id,
            "tutor_id": tutor_id,
            "student_id": student_id,
            "timeslot": timeslot
        })

        return jsonify({
            "message": "Trial booking confirmed successfully. Tutor will be notified.",
            "booking_id": booking["id"]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)