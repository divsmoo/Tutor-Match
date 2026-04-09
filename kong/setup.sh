#!/bin/sh
# Kong key-auth setup script
# Runs once on startup via the kong-setup container.
# Registers all 14 microservices as Kong services+routes, enables key-auth,
# creates a single consumer "tutormatch-frontend" and issues it an API key.

ADMIN="http://kong:8001"
API_KEY="tm-frontend-api-key-2026"

echo "Waiting for Kong Admin API..."
until curl -sf "$ADMIN" > /dev/null; do
  sleep 2
done
echo "Kong is ready."

# Helper: create a service if it doesn't exist, then a route on it
register() {
  NAME=$1
  UPSTREAM=$2
  shift 2
  # All remaining args are paths

  # Create service (idempotent)
  curl -sf -o /dev/null -X PUT "$ADMIN/services/$NAME" \
    -d "url=$UPSTREAM" || true

  # Create route (idempotent via named route) — no method restriction so OPTIONS preflight works
  ROUTE_NAME="${NAME}-route"
  curl -sf -o /dev/null -X PUT "$ADMIN/routes/$ROUTE_NAME" \
    -d "service.name=$NAME" \
    -d "strip_path=false" \
    -d "name=$ROUTE_NAME" \
    $(for P in "$@"; do printf -- "-d paths[]=%s " "$P"; done) || true
}

# ── Atomic services ────────────────────────────────────────────────
register tutor-svc         "http://tutor:5001"                /tutor
register student-svc       "http://student:5002"              /student
register interest-svc      "http://interest:5003"             /interest
register trials-svc        "http://trials:5004"               /trials
register payment-svc       "http://payment:5005"              /payment
register credit-svc        "http://credit:5007"               /graphql /credit

# ── Composite services ─────────────────────────────────────────────
register indicate-interest-svc      "http://indicate-interest:5010"       /indicate-interest
register get-interested-svc         "http://get-interested-students:5011" /interested-students
register accept-student-svc         "http://accept-student:5012"          /accept-student
register make-trial-svc             "http://make-trial-booking:5013"      /make-trial-booking /initiate-payment /confirm-booking
register continue-lessons-svc       "http://continue-lessons:5014"        /continue-lessons
register cancel-trial-booking-svc   "http://cancel-trial-booking:5015"    /cancel-trial-booking
register cancel-trial-lessons-svc   "http://cancel-trial-lessons:5016"    /cancel-trial

echo "Services and routes registered."

# ── Enable CORS plugin globally (required for browser preflight) ──
curl -sf -o /dev/null -X POST "$ADMIN/plugins" \
  -d "name=cors" \
  -d "config.origins[]=http://localhost:5173" \
  -d "config.origins[]=http://localhost:3000" \
  -d "config.methods[]=GET" \
  -d "config.methods[]=POST" \
  -d "config.methods[]=PUT" \
  -d "config.methods[]=DELETE" \
  -d "config.methods[]=OPTIONS" \
  -d "config.headers[]=Content-Type" \
  -d "config.headers[]=apikey" \
  -d "config.headers[]=Authorization" \
  -d "config.credentials=true" \
  -d "config.preflight_continue=false" \
  -d "config.max_age=3600" || true

echo "CORS plugin enabled globally."

# ── Enable key-auth plugin globally ───────────────────────────────
curl -sf -o /dev/null -X POST "$ADMIN/plugins" \
  -d "name=key-auth" \
  -d "config.hide_credentials=true" || true

echo "key-auth plugin enabled globally."

# ── Create consumer ────────────────────────────────────────────────
curl -sf -o /dev/null -X PUT "$ADMIN/consumers/tutormatch-frontend" \
  -d "username=tutormatch-frontend" || true

# ── Issue API key (idempotent: delete existing then recreate) ──────
curl -sf -o /dev/null -X DELETE "$ADMIN/consumers/tutormatch-frontend/key-auth/$API_KEY" || true
curl -sf -o /dev/null -X POST "$ADMIN/consumers/tutormatch-frontend/key-auth" \
  -d "key=$API_KEY" || true

echo "Consumer 'tutormatch-frontend' created with key: $API_KEY"
echo "Kong setup complete."
