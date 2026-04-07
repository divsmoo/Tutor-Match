from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import pika
import threading
import smtplib
import json
import os
from email.mime.text import MIMEText

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = 5006

RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")


# ── Send email helper ─────────────────────────
def send_email(to_address, subject, body):
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = to_address

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_address, msg.as_string())
        print(f"[Notification] Email sent to {to_address}")
    except Exception as e:
        print(f"[Notification] Email failed: {e}")


# ── RabbitMQ consumer ─────────────────────────
# Listens for events published by other services

def on_interest_created(ch, method, properties, body):
    """Scenario 1 — Notify tutor when a student indicates interest"""
    data = json.loads(body)
    tutor_email = data.get("tutor_email")
    student_name = data.get("student_name")
    send_email(
        to_address=tutor_email,
        subject="New Student Interest",
        body=f"Hi, a student ({student_name}) has indicated interest in your tutoring. Please log in to review."
    )
    ch.basic_ack(delivery_tag=method.delivery_tag)


def on_interest_accepted(ch, method, properties, body):
    """Scenario 2 — Notify student when tutor accepts and proposes dates"""
    data = json.loads(body)
    student_email = data.get("student_email")
    tutor_name = data.get("tutor_name")
    proposed_dates = data.get("proposed_dates", [])
    send_email(
        to_address=student_email,
        subject="Tutor Accepted Your Interest",
        body=f"Hi, {tutor_name} has accepted your interest and proposed the following dates: {proposed_dates}. Please log in to confirm."
    )
    ch.basic_ack(delivery_tag=method.delivery_tag)


def on_lesson_confirmed(ch, method, properties, body):
    """Scenario 3 — Send calendar invite to both parties after payment"""
    data = json.loads(body)
    student_email = data.get("student_email")
    tutor_email = data.get("tutor_email")
    confirmed_date = data.get("confirmed_date")

    send_email(student_email, "Lesson Confirmed", f"Your lesson is confirmed on {confirmed_date}.")
    send_email(tutor_email, "Lesson Confirmed", f"Your lesson with a student is confirmed on {confirmed_date}.")
    ch.basic_ack(delivery_tag=method.delivery_tag)


def on_lesson_continued(ch, method, properties, body):
    """Scenario 2c — Notify tutor when student opts to continue lessons"""
    data = json.loads(body)
    tutor_email = data.get("tutor_email")
    tutor_name = data.get("tutor_name")
    send_email(
        to_address=tutor_email,
        subject="A Student Wants to Continue Lessons",
        body=f"Hi {tutor_name}, a student has opted to continue lessons with you. Please log in to arrange further sessions."
    )
    ch.basic_ack(delivery_tag=method.delivery_tag)


def on_trial_cancelled(ch, method, properties, body):
    data = json.loads(body)
    cancelled_by = data.get("cancelled_by", "STUDENT")
    student_email = data.get("student_email")
    tutor_email = data.get("tutor_email")

    if cancelled_by == "TUTOR":
        # Scenario 3b — Notify student when tutor cancels
        send_email(
            to_address=student_email,
            subject="Trial Lesson Cancelled by Tutor",
            body="Your tutor has cancelled the trial lesson."
        )
    else:
        # Scenario 3a — Notify tutor when student cancels
        send_email(
            to_address=tutor_email,
            subject="Trial Lesson Cancelled",
            body="A student has cancelled their trial booking."
        )
    ch.basic_ack(delivery_tag=method.delivery_tag)


def start_consuming():
    """Start listening to all RabbitMQ queues in a background thread"""
    import time
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()

            # Declare queues (safe to call even if they already exist)
            queues = {
                "InterestCreated": on_interest_created,
                "InterestAccepted": on_interest_accepted,
                "LessonConfirmed": on_lesson_confirmed,
                "TrialCancelled": on_trial_cancelled,
                "LessonContinued": on_lesson_continued,
            }

            for queue_name, callback in queues.items():
                channel.queue_declare(queue=queue_name, durable=True)
                channel.basic_consume(queue=queue_name, on_message_callback=callback)

            print("[Notification] Listening for events...")
            channel.start_consuming()

        except Exception as e:
            print(f"[Notification] RabbitMQ connection error: {e}. Retrying in 5s...")
            time.sleep(5)


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "notification", "status": "running"}), 200


# ─────────────────────────────────────────────
if __name__ == "__main__":
    # Start RabbitMQ consumer in a background thread
    # so Flask can still run alongside it
    consumer_thread = threading.Thread(target=start_consuming, daemon=True)
    consumer_thread.start()

    app.run(host="0.0.0.0", port=PORT, debug=True, use_reloader=False)
