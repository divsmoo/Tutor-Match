from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

PORT = 5005

PAYMENT_GATEWAY_URL = os.environ.get("PAYMENT_GATEWAY_URL")
PAYMENT_GATEWAY_API_KEY = os.environ.get("PAYMENT_GATEWAY_API_KEY")


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "payment", "status": "running"}), 200


# ── POST process a payment ────────────────────
# Called by the Booking service (orchestration)
# Expected body: { "booking_id": 1, "student_id": 1, "amount": 50 }
@app.route("/payment", methods=["POST"])
def process_payment():
    try:
        data = request.get_json()

        booking_id = data.get("booking_id")
        student_id = data.get("student_id")
        amount = data.get("amount")

        if not all([booking_id, student_id, amount]):
            return jsonify({"error": "Missing required fields: booking_id, student_id, amount"}), 400

        # ── Mock payment gateway call ─────────────
        # TODO: Replace this with a real sandbox API call when ready
        # Example:
        # gateway_response = requests.post(
        #     f"{PAYMENT_GATEWAY_URL}/charge",
        #     headers={"Authorization": f"Bearer {PAYMENT_GATEWAY_API_KEY}"},
        #     json={"amount": amount, "currency": "SGD", "reference": str(booking_id)}
        # )
        # For now, mock a successful payment
        mock_transaction_id = f"TXN-{booking_id}-{student_id}"
        payment_status = "SUCCESS"

        # Save payment record to Supabase
        payment_record = {
            "booking_id": booking_id,
            "student_id": student_id,
            "amount": amount,
            "status": payment_status,
            "transaction_id": mock_transaction_id
        }
        response = supabase.table("payment").insert(payment_record).execute()

        return jsonify({
            "message": "Payment successful",
            "transaction_id": mock_transaction_id,
            "data": response.data
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET payment by booking ID ─────────────────
@app.route("/payment/booking/<int:booking_id>", methods=["GET"])
def get_payment_by_booking(booking_id):
    try:
        response = supabase.table("payment").select("*").eq("booking_id", booking_id).execute()
        if not response.data:
            return jsonify({"error": "Payment not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
