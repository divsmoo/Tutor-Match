from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Supabase Config
SUPABASE_URL = "https://effbychudvpmpjafxrfr.supabase.co"
SUPABASE_KEY = "sb_publishable_S8AkmmMOyTanEqnt7zI9oQ_uCk92qYK"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

VALID_STATUSES = ['CONFIRMED', 'USER_CANCELLED', 'TUTOR_CANCELLED']

# -----------------------------------------------
# GET all trials
# -----------------------------------------------
@app.route("/trials", methods=['GET'])
def get_all_trials():
    try:
        response = supabase.table('trials').select('*').execute()

        return jsonify({
            "code": 200,
            "data": response.data
        }), 200

    except Exception as e:
        return jsonify({
            "code": 500,
            "message": f"An error occurred: {str(e)}"
        }), 500


# -----------------------------------------------
# POST create a new trial
# -----------------------------------------------
@app.route("/trials", methods=['POST'])
def create_trial():
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['student_id', 'tutor_id', 'trial_date', 'start_time', 'end_time']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "code": 400,
                    "message": f"Missing required field: {field}"
                }), 400

        trial_data = {
            'student_id': data['student_id'],
            'tutor_id': data['tutor_id'],
            'trial_date': data['trial_date'],
            'start_time': data['start_time'],
            'end_time': data['end_time'],
            'subject': data.get('subject', ''),
            'notes': data.get('notes', ''),
            'status': 'PENDING',
            'created_at': datetime.now().isoformat()
        }

        response = supabase.table('trials').insert(trial_data).execute()

        return jsonify({
            "code": 201,
            "message": "Trial created successfully",
            "data": response.data[0]
        }), 201

    except Exception as e:
        return jsonify({
            "code": 500,
            "message": f"An error occurred: {str(e)}"
        }), 500


# -----------------------------------------------
# PUT update trial status
# -----------------------------------------------
@app.route("/trials/<int:trial_id>", methods=['PUT'])
def update_trial_status(trial_id):
    try:
        data = request.get_json()

        # Validate status field exists
        if 'status' not in data:
            return jsonify({
                "code": 400,
                "message": "Missing required field: status"
            }), 400

        # Validate status value
        if data['status'] not in VALID_STATUSES:
            return jsonify({
                "code": 400,
                "message": f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
            }), 400

        # Check if trial exists
        existing = supabase.table('trials').select('*').eq('trial_id', trial_id).execute()
        if len(existing.data) == 0:
            return jsonify({
                "code": 404,
                "message": f"Trial {trial_id} not found"
            }), 404

        # Update trial status
        update_data = {
            'status': data['status'],
            'updated_at': datetime.now().isoformat()
        }

        response = supabase.table('trials').update(update_data).eq('trial_id', trial_id).execute()

        return jsonify({
            "code": 200,
            "message": f"Trial {trial_id} status updated to {data['status']}",
            "data": response.data[0]
        }), 200

    except Exception as e:
        return jsonify({
            "code": 500,
            "message": f"An error occurred: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5007, debug=True)


