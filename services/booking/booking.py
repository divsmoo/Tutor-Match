from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import requests as http
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

PORT = 5004

# Booking status values
STATUS_PENDING_STUDENT = "PENDING_STUDENT_CONFIRMATION"
STATUS_PENDING_PAYMENT = "PENDING_PAYMENT"
STATUS_CONFIRMED = "CONFIRMED"
STATUS_CANCELLED = "CANCELLED"

# URL of the payment service (via Docker service name)
PAYMENT_SERVICE_URL = "http://payment:5005"


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "booking", "status": "running"}), 200


# ── GET all bookings ──────────────────────────
@app.route("/booking", methods=["GET"])
def get_all_bookings():
    try:
        response = supabase.table("trials").select("*").execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET one booking by ID ─────────────────────
@app.route("/booking/<int:booking_id>", methods=["GET"])
def get_booking(booking_id):
    try:
        response = supabase.table("trials").select("*").eq("trial_id", booking_id).execute()
        if not response.data:
            return jsonify({"error": "Booking not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST create a booking (after student selects a date) ─────
# Expected body: { "interest_id": 1, "student_id": 1, "tutor_id": 2, "selected_date": "2025-04-01" }
# This also orchestrates the payment call
@app.route("/booking", methods=["POST"])
def create_booking():
    try:
        data = request.get_json()
        data["status"] = STATUS_PENDING_PAYMENT

        # Step 1 — Save booking as PENDING_PAYMENT
        booking_response = supabase.table("trials").insert(data).execute()
        booking = booking_response.data[0]

        # Step 2 — Orchestrate: call Payment service synchronously
        payment_payload = {
            "booking_id": booking["id"],
            "student_id": data["student_id"],
            "amount": data.get("amount", 0)
        }
        payment_response = http.post(f"{PAYMENT_SERVICE_URL}/payment", json=payment_payload)

        if payment_response.status_code != 201:
            # Payment failed — update booking to CANCELLED
            supabase.table("trials").update({"status": STATUS_CANCELLED}).eq("id", booking["id"]).execute()
            return jsonify({"error": "Payment failed", "details": payment_response.json()}), 400

        # Step 3 — Payment succeeded — update booking to CONFIRMED
        supabase.table("trials").update({"status": STATUS_CONFIRMED}).eq("id", booking["id"]).execute()
        return jsonify({"message": "Booking confirmed", "booking_id": booking["id"]}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PUT update booking status ─────────────────
# e.g. for cancellations: { "status": "CANCELLED" }
@app.route("/booking/<int:booking_id>", methods=["PUT"])
def update_booking(booking_id):
    try:
        data = request.get_json()
        response = supabase.table("trials").update(data).eq("id", booking_id).execute()
        if not response.data:
            return jsonify({"error": "Booking not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
