from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Supabase Config
<<<<<<< Updated upstream:services/booking/booking.py
SUPABASE_URL = "https://effbychudvpmpjafxrfr.supabase.co"
SUPABASE_KEY = "sb_publishable_S8AkmmMOyTanEqnt7zI9oQ_uCk92qYK"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
=======
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
>>>>>>> Stashed changes:services/trials/trials.py

def _is_placeholder_env(value: str | None) -> bool:
    if not value:
        return True
    lowered = value.lower()
    return "your-project-id" in lowered or "your-supabase-anon-key-here" in lowered


USE_MOCK_DB = _is_placeholder_env(SUPABASE_URL) or _is_placeholder_env(SUPABASE_KEY)

supabase: Client | None
if USE_MOCK_DB:
    supabase = None
else:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Include the statuses used by composite flows
VALID_STATUSES = [
    "CONFIRMED",
    "PENDING",
    "PENDING_PAYMENT",
    "USER_CANCELLED",
    "TUTOR_CANCELLED",
    "COMPLETED",
]

# Simple in-memory store for local testing when Supabase isn't configured.
# This is per-container and resets on restart.
_mock_trials: list[dict] = []
_mock_next_trial_id = 1


def _mock_insert(trial_data: dict) -> dict:
    global _mock_next_trial_id
    row = dict(trial_data)
    row["trial_id"] = _mock_next_trial_id
    _mock_next_trial_id += 1
    _mock_trials.append(row)
    return row


def _mock_find(trial_id: int) -> dict | None:
    for t in _mock_trials:
        if int(t.get("trial_id", -1)) == int(trial_id):
            return t
    return None

<<<<<<< Updated upstream:services/booking/booking.py
=======
# ── Health check ─────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "service": "trials",
            "status": "running",
            "db": "mock" if USE_MOCK_DB else "supabase",
        }
    ), 200


>>>>>>> Stashed changes:services/trials/trials.py
# -----------------------------------------------
# GET all trials
# -----------------------------------------------
@app.route("/trials", methods=['GET'])
def get_all_trials():
    try:
        if USE_MOCK_DB:
            return jsonify({"code": 200, "data": _mock_trials}), 200

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
            'status': data.get('status', 'PENDING'),
            'created_at': datetime.now().isoformat()
        }

        if trial_data["status"] not in VALID_STATUSES:
            return jsonify({
                "code": 400,
                "message": f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
            }), 400

        if USE_MOCK_DB:
            row = _mock_insert(trial_data)
            return jsonify({"code": 201, "message": "Trial created successfully", "data": row}), 201

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

        if USE_MOCK_DB:
            existing = _mock_find(trial_id)
            if existing is None:
                return jsonify({"code": 404, "message": f"Trial {trial_id} not found"}), 404

            existing["status"] = data["status"]
            existing["updated_at"] = datetime.now().isoformat()
            return jsonify({
                "code": 200,
                "message": f"Trial {trial_id} status updated to {data['status']}",
                "data": existing
            }), 200

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
    app.run(host="0.0.0.0", port=5004, debug=True)


