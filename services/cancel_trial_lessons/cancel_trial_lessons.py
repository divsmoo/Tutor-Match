from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# Atomic microservice URLs
TRIALS_URL = "http://127.0.0.1:5007/trials"

# -----------------------------------------------
# POST /cancel-trial/<trial_id>
# Composite service to cancel a trial booking
# -----------------------------------------------
@app.route("/cancel-trial/<int:trial_id>", methods=['POST'])
def cancel_trial(trial_id):
    try:
        data = request.get_json()

        # Validate who is cancelling
        if 'cancelled_by' not in data:
            return jsonify({
                "code": 400,
                "message": "Missing required field: cancelled_by (STUDENT or TUTOR)"
            }), 400

        cancelled_by = data['cancelled_by'].upper()

        if cancelled_by == 'STUDENT':
            new_status = 'USER_CANCELLED'
        elif cancelled_by == 'TUTOR':
            new_status = 'TUTOR_CANCELLED'
        else:
            return jsonify({
                "code": 400,
                "message": "cancelled_by must be either STUDENT or TUTOR"
            }), 400

        # Step 1: Update trial status via TrialsDB
        trial_response = requests.put(
            f"{TRIALS_URL}/{trial_id}",
            json={"status": new_status}
        )

        trial_result = trial_response.json()

        # Check if trial was found and updated
        if trial_response.status_code == 404:
            return jsonify({
                "code": 404,
                "message": f"Trial {trial_id} not found"
            }), 404

        if trial_response.status_code != 200:
            return jsonify({
                "code": 500,
                "message": "Failed to update trial status",
                "error": trial_result
            }), 500

        # Step 2: Return success
        return jsonify({
            "code": 200,
            "message": f"Trial {trial_id} successfully cancelled by {cancelled_by}",
            "data": trial_result.get("data")
        }), 200

    except Exception as e:
        return jsonify({
            "code": 500,
            "message": f"An error occurred: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5016, debug=True)