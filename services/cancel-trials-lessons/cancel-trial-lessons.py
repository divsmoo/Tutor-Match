from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import pika
import json
import os

app = Flask(__name__)
CORS(app)

TRIALS_URL = os.environ.get("TRIALS_SERVICE_URL", "http://127.0.0.1:5007")
CREDIT_URL = os.environ.get("CREDIT_SERVICE_URL", "http://127.0.0.1:5008")
STUDENT_URL = os.environ.get("STUDENT_SERVICE_URL", "http://127.0.0.1:5002")
TUTOR_URL = os.environ.get("TUTOR_SERVICE_URL", "http://127.0.0.1:5001")
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "localhost")

def publish_trial_cancelled(student_email, tutor_email, cancelled_by):
    """Publish TrialCancelled event to RabbitMQ"""
    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=RABBITMQ_HOST)
        )
        channel = connection.channel()
        channel.queue_declare(queue="TrialCancelled", durable=True)
        channel.basic_publish(
            exchange="",
            routing_key="TrialCancelled",
            body=json.dumps({
                "student_email": student_email,
                "tutor_email": tutor_email,
                "cancelled_by": cancelled_by
            }),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"[cancel_trial_lessons] Published TrialCancelled event")
    except Exception as e:
        print(f"[cancel_trial_lessons] RabbitMQ error: {e}")

@app.route("/cancel-trial/<int:trial_id>", methods=['POST'])
def cancel_trial(trial_id):
    try:
        data = request.get_json()

        if 'cancelled_by' not in data:
            return jsonify({
                "code": 400,
                "message": "Missing required field: cancelled_by (STUDENT or TUTOR)"
            }), 400

        cancelled_by = data['cancelled_by'].upper()

        if cancelled_by == 'STUDENT':
            new_status = 'USER_CANCELLED'
        elif cancelled_by == 'TUTOR':
            new_status = 'TUTOR_CANCELLED'
        else:
            return jsonify({
                "code": 400,
                "message": "cancelled_by must be STUDENT or TUTOR"
            }), 400

        # Step 1 — Update trial status
        print(f"[cancel_trial_lessons] Updating trial {trial_id} to {new_status}")
        trial_response = requests.put(
            f"{TRIALS_URL}/trials/{trial_id}",
            json={"status": new_status},
            headers={"Content-Type": "application/json"}
        )

        if trial_response.status_code == 404:
            return jsonify({
                "code": 404,
                "message": f"Trial {trial_id} not found"
            }), 404

        if trial_response.status_code != 200:
            return jsonify({
                "code": 500,
                "message": "Failed to update trial status",
                "error": trial_response.json()
            }), 500

        trial_data = trial_response.json().get("data", {})
        student_id = trial_data.get("student_id")
        tutor_id = trial_data.get("tutor_id")

        # Step 2 — Refund student credits via GraphQL
        print(f"[cancel_trial_lessons] Refunding credits to student {student_id}")
        credit_mutation = """
            mutation {
                upsertCredits(studentId: %d, amount: 50) {
                    studentId
                    balance
                }
            }
        """ % student_id
        credit_response = requests.post(
            f"{CREDIT_URL}/graphql",
            json={"query": credit_mutation},
            headers={"Content-Type": "application/json"}
        )

        if credit_response.status_code != 200 or credit_response.json().get("errors"):
            print(f"[cancel_trial_lessons] Credit refund failed: {credit_response.text}")

        # Step 3 — Get student and tutor emails for notification
        student_email = None
        tutor_email = None

        student_response = requests.get(f"{STUDENT_URL}/students/{student_id}")
        if student_response.status_code == 200:
            student_email = student_response.json().get("data", {}).get("email")

        tutor_response = requests.get(f"{TUTOR_URL}/tutors/{tutor_id}")
        if tutor_response.status_code == 200:
            tutor_email = tutor_response.json().get("data", {}).get("email")

        # Step 4 — Publish to RabbitMQ
        publish_trial_cancelled(student_email, tutor_email, cancelled_by)

        return jsonify({
            "code": 200,
            "message": f"Trial {trial_id} cancelled by {cancelled_by}. Credits refunded to student.",
            "data": {
                "trial": trial_data,
                "credit_refund": credit_response.json().get("data", {}).get("upsertCredits") if credit_response.status_code == 200 else "failed"
            }
        }), 200

    except Exception as e:
        print(f"[cancel_trial_lessons] Exception: {str(e)}")
        return jsonify({
            "code": 500,
            "message": f"An error occurred: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5016, debug=True)