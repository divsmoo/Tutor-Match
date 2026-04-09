from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import requests
import pika
import json
import os

app = Flask(__name__)
CORS(app)

TRIALS_URL  = os.environ.get("TRIALS_SERVICE_URL",  "http://trials:5004")
CREDIT_URL  = os.environ.get("CREDIT_SERVICE_URL",  "http://credit:5007")
STUDENT_URL = os.environ.get("STUDENT_SERVICE_URL", "http://student:5002")
TUTOR_URL   = os.environ.get("TUTOR_SERVICE_URL",   "http://tutor:5001")
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "localhost")


def publish_trial_cancelled(student_email):
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
                "cancelled_by": "TUTOR"
            }),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"[cancel_trial_lessons] Published TrialCancelled event")
    except Exception as e:
        print(f"[cancel_trial_lessons] RabbitMQ error: {e}")


@app.route("/health", methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

@app.route("/cancel-trial", methods=['POST'])
def cancel_trial():
    try:
        data = request.get_json()
        trial_id = data.get("trial_id")
        if trial_id is None:
            return jsonify({"code": 400, "message": "Missing required field: trial_id"}), 400

        # Step 1 — Update trial status to TUTOR_CANCELLED
        print(f"[cancel_trial_lessons] Updating trial {trial_id} to TUTOR_CANCELLED")
        trial_response = requests.put(
            f"{TRIALS_URL}/trials/{trial_id}",
            json={"status": "TUTOR_CANCELLED"},
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

        # Step 2 — Calculate refund amount (rate × duration) and refund credits
        print(f"[cancel_trial_lessons] Refunding credits to student {student_id}")
        refund_amount = 50.0  # fallback
        try:
            start_t = trial_data.get("start_time", "")
            end_t   = trial_data.get("end_time", "")
            tutor_id = trial_data.get("tutor_id")
            tutor_resp = requests.get(f"{TUTOR_URL}/tutor/{tutor_id}", timeout=10)
            if tutor_resp.status_code == 200:
                rate = tutor_resp.json().get("data", {}).get("rate", 0)
                for fmt in ("%H:%M:%S", "%H:%M"):
                    try:
                        s = datetime.strptime(start_t, fmt)
                        e = datetime.strptime(end_t, fmt)
                        hours = max((e - s).seconds / 3600.0, 0)
                        refund_amount = round(rate * hours, 2)
                        break
                    except ValueError:
                        continue
        except Exception as ex:
            print(f"[cancel_trial_lessons] Could not calculate refund amount, using fallback: {ex}")

        credit_mutation = """
            mutation {
                upsertCredits(studentId: %d, amount: %f) {
                    studentId
                    balance
                }
            }
        """ % (student_id, refund_amount)
        credit_response = requests.post(
            f"{CREDIT_URL}/graphql",
            json={"query": credit_mutation},
            headers={"Content-Type": "application/json"}
        )

        if credit_response.status_code != 200 or credit_response.json().get("errors"):
            print(f"[cancel_trial_lessons] Credit refund failed: {credit_response.text}")

        # Step 3 — Get student email for notification
        student_email = None

        student_response = requests.get(f"{STUDENT_URL}/student/{student_id}")
        if student_response.status_code == 200:
            student_email = student_response.json().get("data", {}).get("details", {}).get("studentEmail")

        # Step 4 — Publish to RabbitMQ
        publish_trial_cancelled(student_email)

        return jsonify({
            "code": 200,
            "message": f"Trial {trial_id} cancelled by tutor. Credits refunded to student.",
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
