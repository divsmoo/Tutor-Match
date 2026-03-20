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

PORT = 5002


# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "student", "status": "running"}), 200


# ── GET all students ──────────────────────────
@app.route("/student", methods=["GET"])
def get_all_students():
    try:
        response = supabase.table("student").select("*").execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET one student by ID ─────────────────────
@app.route("/student/<int:student_id>", methods=["GET"])
def get_student(student_id):
    try:
        response = supabase.table("student").select("*").eq("id", student_id).execute()
        if not response.data:
            return jsonify({"error": "Student not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST create a student ─────────────────────
@app.route("/student", methods=["POST"])
def create_student():
    try:
        data = request.get_json()
        response = supabase.table("student").insert(data).execute()
        return jsonify({"data": response.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PUT update a student ──────────────────────
@app.route("/student/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    try:
        data = request.get_json()
        response = supabase.table("student").update(data).eq("id", student_id).execute()
        if not response.data:
            return jsonify({"error": "Student not found"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── DELETE a student ──────────────────────────
@app.route("/student/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    try:
        supabase.table("student").delete().eq("id", student_id).execute()
        return jsonify({"message": "Student deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
