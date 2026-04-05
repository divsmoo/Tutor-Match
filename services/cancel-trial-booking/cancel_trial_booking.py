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

PORT = 5015
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")

BOOKING_SERVICE_URL = os.environ.get("BOOKING_SERVICE_URL", "http://booking:5004")
TUTOR_SERVICE_URL = os.environ.get("TUTOR_SERVICE_URL", "http://tutor:5001")

# Trials that can still be cancelled by the student (after tutor proposes; before terminal states)
CANCELLABLE_STATUSES = frozenset({"PENDING", "CONFIRMED"})


def publish_event(queue_name: str, message: dict):
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
        print(f"[cancel-trial-booking] Published to {queue_name}: {message}")
    except Exception as e:
        print(f"[cancel-trial-booking] RabbitMQ publish error: {e}")
        raise


def _get_trials_from_booking():
    r = http.get(f"{BOOKING_SERVICE_URL}/trials", timeout=30)
    if r.status_code != 200:
        return None, r
    payload = r.json()
    data = payload.get("data")
    if data is None:
        return None, r
    return data, r


def _trials_for_pair(trials, student_id, tutor_id):
    return [
        t
        for t in trials
        if int(t.get("student_id", -1)) == int(student_id)
        and int(t.get("tutor_id", -1)) == int(tutor_id)
    ]


def _select_trial_for_cancel(pair_trials, trial_id=None):
    cancellable = [t for t in pair_trials if t.get("status") in CANCELLABLE_STATUSES]
    if not cancellable:
        return None, "No active trial found for this student and tutor (nothing to cancel)."

    if trial_id is not None:
        tid = int(trial_id)
        for t in cancellable:
            if int(t.get("trial_id", -1)) == tid:
                return t, None
        return None, f"No cancellable trial with trial_id={trial_id} for this pair."

    if len(cancellable) == 1:
        return cancellable[0], None

    return (
        None,
        "Multiple active trials found; include trial_id in the request body to choose one.",
    )


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "cancel-trial-booking", "status": "running"}), 200


@app.route("/trials/available-dates", methods=["GET"])
def get_available_dates():
    """
    Scenario 3a — steps 1–2: list cancellable trials for this student–tutor pair
    (proxies Booking /trials — the Trials atomic service).
    Query: student_id, tutor_id (required)
    """
    student_id = request.args.get("student_id", type=int)
    tutor_id = request.args.get("tutor_id", type=int)
    if student_id is None or tutor_id is None:
        return jsonify({"error": "Query parameters student_id and tutor_id are required."}), 400

    trials, raw = _get_trials_from_booking()
    if trials is None:
        return (
            jsonify(
                {
                    "error": "Failed to fetch trials from booking service",
                    "details": raw.text if raw else None,
                }
            ),
            502,
        )

    pair = _trials_for_pair(trials, student_id, tutor_id)
    available = [t for t in pair if t.get("status") in CANCELLABLE_STATUSES]

    return (
        jsonify(
            {
                "student_id": student_id,
                "tutor_id": tutor_id,
                "trials": available,
            }
        ),
        200,
    )


@app.route("/cancel-trial-booking", methods=["POST"])
def cancel_trial_booking():
    """
    Scenario 3a — steps 3–7: cancel → PUT booking → AMQP TrialCancelled → response.
    Body JSON: { "student_id", "tutor_id" [, "trial_id" ] }
    """
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get("student_id")
        tutor_id = data.get("tutor_id")
        trial_id = data.get("trial_id")

        if student_id is None or tutor_id is None:
            return (
                jsonify(
                    {"error": "Missing required fields: student_id, tutor_id"}
                ),
                400,
            )

        trials, raw = _get_trials_from_booking()
        if trials is None:
            return (
                jsonify(
                    {
                        "error": "Failed to fetch trials from booking service",
                        "details": raw.text if raw else None,
                    }
                ),
                502,
            )

        pair_trials = _trials_for_pair(trials, student_id, tutor_id)
        trial, err = _select_trial_for_cancel(pair_trials, trial_id)
        if err:
            code = 404 if ("No active" in err or "No cancellable" in err) else 400
            return jsonify({"error": err}), code

        tid = int(trial["trial_id"])
        put_body = {"status": "USER_CANCELLED"}
        put_resp = http.put(
            f"{BOOKING_SERVICE_URL}/trials/{tid}",
            json=put_body,
            timeout=30,
        )

        if put_resp.status_code != 200:
            try:
                details = put_resp.json()
            except Exception:
                details = put_resp.text
            return (
                jsonify(
                    {
                        "error": "Failed to update trial status",
                        "details": details,
                    }
                ),
                put_resp.status_code,
            )

        updated = put_resp.json().get("data", {})

        tutor_resp = http.get(f"{TUTOR_SERVICE_URL}/tutor/{tutor_id}", timeout=15)
        if tutor_resp.status_code != 200:
            return (
                jsonify(
                    {
                        "error": "Trial was cancelled but tutor could not be loaded for notification",
                        "trial": updated,
                    }
                ),
                502,
            )

        tutor = tutor_resp.json().get("data", {})
        tutor_email = tutor.get("contact_info")
        if not tutor_email:
            return (
                jsonify(
                    {
                        "error": "Trial cancelled but tutor has no contact_info email for notification",
                        "trial": updated,
                    }
                ),
                502,
            )

        publish_event(
            "TrialCancelled",
            {
                "trial_id": tid,
                "student_id": int(student_id),
                "tutor_id": int(tutor_id),
                "tutor_email": tutor_email,
                "status": "USER_CANCELLED",
            },
        )

        return (
            jsonify(
                {
                    "message": "Trial booking cancelled. Tutor will be notified.",
                    "trial": updated,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
