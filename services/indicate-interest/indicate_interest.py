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

PORT = 5010

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

# Atomic service URLs (Docker service names)
TUTOR_SERVICE_URL = "http://tutor:5001"
INTEREST_SERVICE_URL = "http://interest:5003"


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


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "indicate-interest", "status": "running"}), 200


# ── POST — Student indicates interest in a tutor ──────────────
# This is the main composite flow for Scenario 1
# Expected body: { "student_id": 1, "tutor_id": 2, "student_name": "Alice" }
@app.route("/indicate-interest", methods=["POST"])
def indicate_interest():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        tutor_id = data.get("tutor_id")
        student_name = data.get("student_name")

        if not all([student_id, tutor_id, student_name]):
            return jsonify({"error": "Missing required fields: student_id, tutor_id, student_name"}), 400

        # Step 1 — Fetch tutor contact info from Tutor service
        tutor_response = http.get(f"{TUTOR_SERVICE_URL}/tutor/{tutor_id}")
        if tutor_response.status_code != 200:
            return jsonify({"error": "Tutor not found"}), 404
        tutor = tutor_response.json()["data"]
        tutor_email = tutor.get("email")

        # Step 2 — Save PENDING interest record in Interest service
        interest_payload = {"student_id": student_id, "tutor_id": tutor_id}
        interest_response = http.post(f"{INTEREST_SERVICE_URL}/interest", json=interest_payload)
        if interest_response.status_code != 201:
            return jsonify({"error": "Failed to create interest record"}), 500
        interest = interest_response.json()["data"][0]

        # Step 3 — Publish InterestCreated event to RabbitMQ
        # Notification service will pick this up and email the tutor
        publish_event("InterestCreated", {
            "interest_id": interest["id"],
            "tutor_id": tutor_id,
            "tutor_email": tutor_email,
            "student_id": student_id,
            "student_name": student_name
        })

        return jsonify({
            "message": "Interest indicated successfully. Tutor will be notified.",
            "interest_id": interest["id"]
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
