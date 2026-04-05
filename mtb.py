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
NOTIFICATION_SERVICE_URL = "http://notification:5006"


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "make-trial-booking", "status": "running"}), 200


### HTTP POST request from student UI to make trial booking
### Takes in student_id, tutor_id, timeslot, trial_id
### 1. Call Payment Service to make payment 
### 2. Calls Booking Service to update status from PENDING to BOOKED/CONFIRMED
### 3. Notify Tutor (tutor_id) via Notification MS
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

        # Step 1 — Call Booking Service to create booking record (initially PENDING)
        booking_payload = {
            "student_id": student_id,
            "tutor_id": tutor_id,
            "timeslot": timeslot,
            "trial_id": trial_id
        }
        booking_response = http.post(f"{BOOKING_SERVICE_URL}/booking", json=booking_payload)
        if booking_response.status_code != 201:
            return jsonify({"error": "Failed to create booking record"}), 500
        booking = booking_response.json()["data"][0]

        # Step 2 — Publish BookingCreated event to RabbitMQ for Notification MS to pick up
        publish_event("BookingCreated", {
            "booking_id": booking["id"],
            "tutor_id": tutor_id,
            "student_id": student_id,
            "timeslot": timeslot
        })

        return jsonify({
            "message": "Trial booking created successfully. Tutor will be notified.",
            "booking_id": booking["id"]
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500





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
        print(f"[indicate-interest] Published to {queue_name}: {message}")
    except Exception as e:
        print(f"[indicate-interest] RabbitMQ publish error: {e}")


# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)

