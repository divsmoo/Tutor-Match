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
TRIALS_SERVICE_URL   = os.environ.get("TRIALS_SERVICE_URL", "http://trials:5004") or "http://localhost:5004"
STUDENT_SERVICE_URL  = os.environ.get("STUDENT_SERVICE_URL", "http://student:5002") or "http://localhost:5002"
TUTOR_SERVICE_URL    = os.environ.get("TUTOR_SERVICE_URL", "http://tutor:5001") or "http://localhost:5001"


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
            properties=pika.BasicProperties(delivery_mode=2)
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
# Scenario 2a
# Expected body:
# {
#   "interest_id": 38,
#   "proposed_dates": ["2024-01-15", "2024-01-16"],
#   "trial_date": "2024-01-15",
#   "start_time": "14:00",
#   "end_time": "15:00"
# }
@app.route("/accept-student", methods=["POST"])
def accept_student():
    try:
        data = request.get_json()

        required_fields = ["interest_id", "proposed_dates", "trial_date", "start_time", "end_time"]
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        interest_id    = data["interest_id"]
        proposed_dates = data["proposed_dates"]

        # Step 1 — Fetch interest record to get tutor_id and student_id
        interest_resp = http.get(f"{INTEREST_SERVICE_URL}/interest/{interest_id}")
        if interest_resp.status_code != 200:
            return jsonify({"error": "Interest record not found", "details": interest_resp.json()}), interest_resp.status_code

        interest = interest_resp.json()["data"]
        tutor_id   = interest["tutor_id"]
        student_id = interest["student_id"]

        # Step 2 — Fetch student email
        student_resp = http.get(f"{STUDENT_SERVICE_URL}/student/{student_id}")
        if student_resp.status_code != 200:
            return jsonify({"error": "Student not found", "details": student_resp.json()}), student_resp.status_code

        student       = student_resp.json()["data"]
        student_email = student["details"]["studentEmail"]

        # Step 3 — Fetch tutor name and subject
        tutor_resp = http.get(f"{TUTOR_SERVICE_URL}/tutor/{tutor_id}")
        if tutor_resp.status_code != 200:
            return jsonify({"error": "Tutor not found", "details": tutor_resp.json()}), tutor_resp.status_code

        tutor      = tutor_resp.json()["data"]
        tutor_name = tutor["name"]
        subject    = tutor["subject"]

        # Step 4 — Update interest status to ACCEPTED
        interest_update_resp = http.put(
            f"{INTEREST_SERVICE_URL}/interest/{interest_id}",
            json={"status": "ACCEPTED"}
        )
        if interest_update_resp.status_code != 200:
            return jsonify({"error": "Failed to update interest status", "details": interest_update_resp.json()}), interest_update_resp.status_code

        # Step 5 — Create trial record in Trials service
        trial_payload = {
            "student_id": student_id,
            "tutor_id":   tutor_id,
            "trial_date": data["trial_date"],
            "start_time": data["start_time"],
            "end_time":   data["end_time"],
            "subject":    subject,
            "notes":      data.get("notes", "")
        }
        trial_resp = http.post(f"{TRIALS_SERVICE_URL}/trials", json=trial_payload)
        if trial_resp.status_code != 201:
            return jsonify({"error": "Failed to create trial", "details": trial_resp.json()}), trial_resp.status_code

        trial = trial_resp.json()["data"]

        # Step 6 — Publish InterestAccepted event to RabbitMQ
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
