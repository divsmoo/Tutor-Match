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

PORT = 5014

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

# Atomic service URLs (Docker service names)
BOOKING_SERVICE_URL = os.environ.get("BOOKING_SERVICE_URL", "http://booking:5004")
TUTOR_SERVICE_URL = os.environ.get("TUTOR_SERVICE_URL", "http://tutor:5001")


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
        print(f"[continue-lessons] Published to {queue_name}: {message}")
    except Exception as e:
        print(f"[continue-lessons] RabbitMQ publish error: {e}")


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "continue-lessons", "status": "running"}), 200


# ── POST — Student opts to continue lessons with tutor ───────
# Scenario 2c composite flow
# Expected body: { "trial_id": 1, "student_id": 2, "tutor_id": 3 }
@app.route("/continue-lessons", methods=["POST"])
def continue_lessons():
    try:
        data = request.get_json()
        trial_id = data.get("trial_id")
        student_id = data.get("student_id")
        tutor_id = data.get("tutor_id")

        if not all([trial_id, student_id, tutor_id]):
            return jsonify({"error": "Missing required fields: trial_id, student_id, tutor_id"}), 400

        # Step 1 — Update trial status to COMPLETED in Booking service
        booking_response = http.put(
            f"{BOOKING_SERVICE_URL}/trials/{trial_id}",
            json={"status": "COMPLETED"}
        )
        if booking_response.status_code != 200:
            return jsonify({
                "error": "Failed to update trial status",
                "details": booking_response.json()
            }), booking_response.status_code

        # Step 2 — Fetch tutor contact information from Tutor service
        tutor_response = http.get(f"{TUTOR_SERVICE_URL}/tutor/{tutor_id}")
        if tutor_response.status_code != 200:
            return jsonify({"error": "Tutor not found"}), 404
        tutor = tutor_response.json()["data"]
        tutor_email = tutor.get("contact_info")
        tutor_name = tutor.get("name")

        # Step 3 — Publish LessonContinued event to RabbitMQ
        # Notification service will pick this up and notify the tutor
        publish_event("LessonContinued", {
            "trial_id": trial_id,
            "student_id": student_id,
            "tutor_id": tutor_id,
            "tutor_email": tutor_email,
            "tutor_name": tutor_name
        })

        # Step 4 — Return tutor contact info to Student UI
        return jsonify({
            "message": "Trial marked as completed. Tutor has been notified.",
            "tutor": {
                "tutor_id": tutor_id,
                "name": tutor_name,
                "contact_info": tutor_email
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
