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

PORT = 5001


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "tutor", "status": "running"}), 200


# ── GET all tutors ────────────────────────────
@app.route("/tutor", methods=["GET"])
def get_all_tutors():
    try:
        response = supabase.table("tutor").select("*").execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET one tutor by ID ───────────────────────
@app.route("/tutor/<int:tutor_id>", methods=["GET"])
def get_tutor(tutor_id):
    try:
        response = supabase.table("tutor").select("*").eq("id", tutor_id).execute()
        if not response.data:
            return jsonify({"error": "Tutor not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST create a tutor ───────────────────────
@app.route("/tutor", methods=["POST"])
def create_tutor():
    try:
        data = request.get_json()
        response = supabase.table("tutor").insert(data).execute()
        return jsonify({"data": response.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PUT update a tutor ────────────────────────
@app.route("/tutor/<int:tutor_id>", methods=["PUT"])
def update_tutor(tutor_id):
    try:
        data = request.get_json()
        response = supabase.table("tutor").update(data).eq("id", tutor_id).execute()
        if not response.data:
            return jsonify({"error": "Tutor not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── DELETE a tutor ────────────────────────────
@app.route("/tutor/<int:tutor_id>", methods=["DELETE"])
def delete_tutor(tutor_id):
    try:
        supabase.table("tutor").delete().eq("id", tutor_id).execute()
        return jsonify({"message": "Tutor deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
