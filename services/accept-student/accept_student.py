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

PORT = 5012

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

# Atomic service URLs (Docker service names)
INTEREST_SERVICE_URL = os.environ.get("INTEREST_SERVICE_URL", "http://interest:5003") or "http://localhost:5003"
BOOKING_SERVICE_URL = os.environ.get("BOOKING_SERVICE_URL", "http://booking:5007") or "http://localhost:5007"


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
            properties=pika.BasicProperties(delivery_mode=2)  # persistent message
        )
        connection.close()
        print(f"[accept-student] Published to {queue_name}: {message}")
    except Exception as e:
        print(f"[accept-student] RabbitMQ publish error: {e}")


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "accept-student", "status": "running"}), 200


# ── POST — Tutor accepts a student and arranges a trial lesson ──
# This is the main composite flow for Scenario 2a
# Expected body:
# {
#   "interest_id": 1,
#   "tutor_id": 2,
#   "student_id": 1,
#   "student_email": "student@example.com",
#   "tutor_name": "Mr Smith",
#   "proposed_dates": ["2024-01-15", "2024-01-16"],
#   "trial_date": "2024-01-15",
#   "start_time": "14:00",
#   "end_time": "15:00",
#   "subject": "Chemistry",
#   "notes": ""                  (optional)
# }
@app.route("/accept-student", methods=["POST"])
def accept_student():
    try:
        data = request.get_json()

        required_fields = [
            "interest_id", "tutor_id", "student_id",
            "student_email", "tutor_name", "proposed_dates",
            "trial_date", "start_time", "end_time", "subject"
        ]
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        interest_id   = data["interest_id"]
        tutor_id      = data["tutor_id"]
        student_id    = data["student_id"]
        student_email = data["student_email"]
        tutor_name    = data["tutor_name"]
        proposed_dates = data["proposed_dates"]

        # Step 1 — Update interest status to ACCEPTED
        interest_resp = http.put(
            f"{INTEREST_SERVICE_URL}/interest/{interest_id}",
            json={"status": "ACCEPTED"}
        )
        if interest_resp.status_code != 200:
            return jsonify({
                "error": "Failed to update interest status",
                "details": interest_resp.json()
            }), interest_resp.status_code

        # Step 2 — Create trial record in Booking/Trials service
        trial_payload = {
            "student_id": student_id,
            "tutor_id":   tutor_id,
            "trial_date": data["trial_date"],
            "start_time": data["start_time"],
            "end_time":   data["end_time"],
            "subject":    data["subject"],
            "notes":      data.get("notes", "")
        }
        trial_resp = http.post(f"{BOOKING_SERVICE_URL}/trials", json=trial_payload)
        if trial_resp.status_code != 201:
            return jsonify({
                "error": "Failed to create trial",
                "details": trial_resp.json()
            }), trial_resp.status_code

        trial = trial_resp.json()["data"]

        # Step 3 — Publish InterestAccepted event to RabbitMQ
        # Notification service picks this up and emails the student
        publish_event("InterestAccepted", {
            "interest_id":    interest_id,
            "student_email":  student_email,
            "tutor_name":     tutor_name,
            "proposed_dates": proposed_dates
        })

        return jsonify({
            "message": "Student accepted. Trial created and student will be notified.",
            "interest_id": interest_id,
            "trial": trial
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
