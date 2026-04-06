from flask import Flask, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import strawberry
from strawberry.flask.views import GraphQLView
from typing import Optional
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ── Types ─────────────────────────────────────
@strawberry.type
class Credit:
    student_id: int
    balance: float


# ── Queries ───────────────────────────────────
@strawberry.type
class Query:
    @strawberry.field
    def credit(self, student_id: int) -> Optional[Credit]:
        response = supabase.table("credit").select("*").eq("student_id", student_id).execute()
        if not response.data:
            return None
        return Credit(**response.data[0])


# ── Mutations ─────────────────────────────────
@strawberry.type
class Mutation:
    @strawberry.mutation
    def upsert_credits(self, student_id: int, amount: float) -> Credit:
        if amount <= 0:
            raise ValueError("Amount must be a positive number")

        existing = supabase.table("credit").select("*").eq("student_id", student_id).execute()

        if existing.data:
            # Record exists — top up by adding to current balance
            new_balance = existing.data[0]["balance"] + amount
            response = (
                supabase.table("credit")
                .update({"balance": new_balance})
                .eq("student_id", student_id)
                .execute()
            )
        else:
            # No record — create new one
            response = (
                supabase.table("credit")
                .insert({"student_id": student_id, "balance": amount})
                .execute()
            )

        return Credit(**response.data[0])


schema = strawberry.Schema(query=Query, mutation=Mutation)

# ── Health check stays REST (Kubernetes readinessProbe needs HTTP GET) ──
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "credit", "status": "running"}), 200

# ── Single GraphQL endpoint (includes GraphiQL playground in browser) ──
app.add_url_rule("/graphql", view_func=GraphQLView.as_view("graphql_view", schema=schema))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5007, debug=True)
