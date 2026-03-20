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

PORT = 5003

# Interest status values
STATUS_PENDING = "PENDING"
STATUS_ACCEPTED = "ACCEPTED"
STATUS_EXPIRED = "EXPIRED"
STATUS_CANCELLED = "CANCELLED"


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "interest", "status": "running"}), 200


# ── GET all interest records ──────────────────
@app.route("/interest", methods=["GET"])
def get_all_interests():
    try:
        response = supabase.table("interest").select("*").execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET interests by tutor ID ─────────────────
@app.route("/interest/tutor/<int:tutor_id>", methods=["GET"])
def get_by_tutor(tutor_id):
    try:
        response = supabase.table("interest").select("*").eq("tutor_id", tutor_id).execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET interests by student ID ───────────────
@app.route("/interest/student/<int:student_id>", methods=["GET"])
def get_by_student(student_id):
    try:
        response = supabase.table("interest").select("*").eq("student_id", student_id).execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST create an interest record ───────────
# Expected body: { "student_id": 1, "tutor_id": 2 }
@app.route("/interest", methods=["POST"])
def create_interest():
    try:
        data = request.get_json()
        data["status"] = STATUS_PENDING  # always starts as PENDING
        response = supabase.table("interest").insert(data).execute()
        return jsonify({"data": response.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PUT update interest status ────────────────
# Expected body: { "status": "ACCEPTED", "proposed_dates": [...] }
@app.route("/interest/<int:interest_id>", methods=["PUT"])
def update_interest(interest_id):
    try:
        data = request.get_json()
        response = supabase.table("interest").update(data).eq("id", interest_id).execute()
        if not response.data:
            return jsonify({"error": "Interest record not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
