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
 
# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "credit", "status": "running"}), 200
 
 
# ── GET credits by student ID ─────────────────
# Returns the student's current credit balance
@app.route("/credit/<int:student_id>", methods=["GET"])
def get_credits(student_id):
    try:
        response = supabase.table("credit").select("*").eq("student_id", student_id).execute()
        if not response.data:
            return jsonify({"error": "No credit record found for this student"}), 404
        return jsonify({"data": response.data[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
 
# ── POST add or upsert credits for a student ──
# - If a record exists for the student, adds `amount` to their current balance
# - If no record exists, creates one with the given `amount` as the starting balance
@app.route("/credit", methods=["POST"])
def upsert_credits():
    try:
        # Expected body: { "student_id": 1, "amount": 50 }
        data = request.get_json()
 
        student_id = data.get("student_id")
        amount = data.get("amount")
    
        # missing fields
        if student_id is None or amount is None:
            return jsonify({"error": "Missing required fields: student_id and amount"}), 400

        # validate amount
        if not isinstance(amount, (int, float)) or amount <= 0:
            return jsonify({"error": "Amount must be a positive number"}), 400
 
        # Check if a credit record already exists for this student
        existing = supabase.table("credit").select("*").eq("student_id", student_id).execute()
 
        if existing.data:
            # Record exists — top up by adding to current balance
            current_balance = existing.data[0]["balance"]
            new_balance = current_balance + amount
            response = (
                supabase.table("credit")
                .update({"balance": new_balance})
                .eq("student_id", student_id)
                .execute()
            )
            return jsonify({
                "message": "Credits topped up successfully",
                "data": response.data[0]
            }), 200
        else:
            # No record — create a new one with the given amount as starting balance
            response = (
                supabase.table("credit")
                .insert({"student_id": student_id, "balance": amount})
                .execute()
            )
            return jsonify({
                "message": "Credit record created successfully",
                "data": response.data[0]
            }), 201
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
 ### When a student books a lesson and uses credits to pay (TO-DO)



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5007, debug=True)
 
