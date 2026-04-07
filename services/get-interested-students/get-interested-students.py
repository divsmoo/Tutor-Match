from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import requests
 
load_dotenv()
 
app = Flask(__name__)
CORS(app)
 
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

INTEREST_SERVICE_URL = os.environ.get("INTEREST_SERVICE_URL", "http://interest:5003")
STUDENT_SERVICE_URL = os.environ.get("STUDENT_SERVICE_URL", "http://student:5002")
 
# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "get-interested-students", "status": "running"}), 200
 
 
# GET list of interested students from tutor_id (called from UI)
@app.route("/interested-students/<int:tutor_id>", methods=["GET"])
def get_interested_students(tutor_id):

    # Step 1 — Get list of student_ids from Interest MS
    interest_resp = requests.get(f"{INTEREST_SERVICE_URL}/interest/tutor/{tutor_id}")
    # interest_resp = requests.get(f"http://interest:5003/interest/tutor/{tutor_id}")
    # interest_resp = requests.get(f"http://localhost:5003/interest/tutor/{tutor_id}")
    if interest_resp.status_code != 200:
        return jsonify({"error": "Interest service error"}), 502

    student_ids = [item["student_id"] for item in interest_resp.json().get("data", [])]


    # Step 2 — Fetch each student's details (one request per student) from Student MS
    students = []
    for sid in student_ids:
        student_resp = requests.get(f"{STUDENT_SERVICE_URL}/student/{sid}")
        # student_resp = requests.get(f"http://student:5002/student/{sid}")
        # student_resp = requests.get(f"http://localhost:5002/student/{sid}")
        if student_resp.status_code != 200:
            return jsonify({"error": f"Student service error for id {sid}! Status: {student_resp.status_code}"}), 502
        students.append(student_resp.json().get("data"))

    # Step 3 — Return aggregated list
    return jsonify({"data": students}), 200
 
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5011, debug=True)
 
