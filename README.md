# Atomic Microservices (Tutor / Interest / Student / Trials)

This folder contains 4 independent Flask+SQLAlchemy microservices:

- `tutor_service`
- `student_service`
- `interest_service`
- `trials_service`

Each service:
- runs as a separate process
- owns its own database (configure via `dbURL`)
- exposes REST APIs returning JSON envelopes: `{ "code": <int>, "data": <object>, "message": <string> }`

## Common env vars

- `dbURL`: SQLAlchemy connection string. Example (MySQL):
  - `mysql+mysqlconnector://root@localhost:3306/tutor`
- `PORT`: service port (defaults per service)

## Run (example)

From each service folder:

- `pip install -r requirements.txt`
- `python app.py`

