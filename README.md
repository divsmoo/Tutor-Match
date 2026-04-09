# TutorMatch — ESD G7T1

> Singapore's tutor matching platform connecting students with expert tutors across every subject.

TutorMatch is a microservices-based web application that enables students to browse tutors, book trial lessons, handle payments, and manage lesson continuations or cancellations — all in one place.

- `tutor_service`
- `student_service`
- `interest_service`
- `trials_service`

Each service:
- runs as a separate process
- owns its own database (configure via `dbURL`)
- exposes REST APIs returning JSON envelopes: `{ "code": <int>, "data": <object>, "message": <string> }`

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Microservices](#microservices)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend — Docker Compose](#backend--docker-compose)
  - [Frontend — React Dev Server](#frontend--react-dev-server)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Monitoring](#monitoring)
- [Contributing Members](#contributing-members)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| Tailwind CSS | Utility-first styling |
| Stripe.js / React Stripe Elements | Payment UI |
| Supabase JS Client | Auth and realtime subscriptions |
| React Router v6 | Client-side routing |

### Backend
| Technology | Purpose |
|---|---|
| Python 3.11 + Flask | Microservice framework |
| Supabase (PostgreSQL) | Hosted relational database |
| RabbitMQ (pika) | Async event messaging between services |
| Strawberry GraphQL | GraphQL API for the Credit service |
| Kong Gateway | API gateway and routing |
| Docker + Docker Compose | Containerisation and orchestration |

### Monitoring
| Technology | Purpose |
|---|---|
| Prometheus | Metrics scraping |
| Grafana | Dashboard visualisation |
| Blackbox Exporter | HTTP health probe monitoring |

---

## Architecture Overview

The platform follows a **microservices architecture** with two service layers:

- **Atomic services** — each owns a single domain and its own Supabase table.
- **Composite services** — orchestrate multiple atomic services to implement end-to-end business scenarios.

All services communicate via **Kong API Gateway** (port `8000`) or directly by port during development. Asynchronous notifications are delivered through **RabbitMQ** queues consumed by the Notification service.

---

## Microservices

### Atomic Services

| Service | Port | Description |
|---|---|---|
| `tutor` | 5001 | CRUD for tutor profiles (name, subject, rate, contact) |
| `student` | 5002 | CRUD for student profiles (details JSON incl. email) |
| `interest` | 5003 | Tracks student interest records with auto-expiry at 48 h |
| `trials` | 5004 | Manages trial lesson records and status transitions |
| `payment` | Outsystems | For Handling Student Payment |
| `notification` | 5006 | RabbitMQ consumer — sends transactional emails via SMTP |
| `credit` | 5007 | GraphQL service for student credit wallet (balance, deduct, top-up) |

### Composite Services

| Service | Port | Scenario |
|---|---|---|
| `indicate-interest` | 5010 | **Scenario 1** — Student indicates interest; notifies tutor via RabbitMQ |
| `get-interested-students` | 5011 | **Scenario 2a** — Tutor views aggregated list of interested students |
| `accept-student` | 5012 | **Scenario 2a** — Tutor accepts student, creates trial, notifies student |
| `make-trial-booking` | 5013 | **Scenario 2b** — Student Makes Payment, confirms trial booking |
| `continue-lessons` | 5014 | **Scenario 2c** — Student marks trial complete; tutor is notified |
| `cancel-trial-booking` | 5015 | **Scenario 3a** — Student cancels a confirmed trial booking |
| `cancel-trial-lessons` | 5016 | **Scenario 3b** — Tutor cancels a confirmed trial and refunds student credits |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Node.js >= 20](https://nodejs.org/) and npm
- A `.env` file in the repo root (see [Environment Variables](#environment-variables))

### Backend — Docker Compose

From the **repo root**, bring up all services (including RabbitMQ, Kong, and monitoring):

```bash
docker compose up -d
```

To check that every service is running:

```bash
docker compose ps
```

**First-time Kong setup** — after the containers are healthy, import the API gateway routes:

_macOS_
```bash
brew tap kong/deck && brew install kong/deck/deck
deck sync --state kong.yaml --kong-addr http://localhost:8001
```

_Windows (PowerShell)_
```powershell
docker run --rm --network host `
  -v "${PWD}:/workspace" -w /workspace `
  kong/deck sync --state kong.yaml --kong-addr http://host.docker.internal:8001
```

Verify Kong routes at **http://localhost:8002** (Kong Manager).

To stop all services:

```bash
docker compose down
```

### Frontend — React Dev Server

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173** (or the port shown in your terminal).

> Make sure the backend services are running before using the frontend.

---

## Environment Variables

Create a `.env` file in the repo root. The following keys are required:

```env
# Supabase
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_KEY=<your-supabase-anon-key>

# RabbitMQ (default values work with docker-compose)
RABBITMQ_HOST=rabbitmq

# Payment (OutSystems)
PAYMENT_SERVICE_URL=https://<your-outsystems-url>/PaymentCore/rest/CreatePaymentAPI/payments

# SMTP (for the Notification service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<your-app-password>
```

Create a `frontend/.env` file for frontend-only secrets:

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_<your-stripe-key>
```

---

## API Documentation

A consolidated **OpenAPI 3.0** spec is located at `openapi.yaml`. Sub-specs per domain are exported to `api-specs/`.

### View in Swagger UI (Docker)

```bash
docker run --rm -p 8081:8080 \
  -e SWAGGER_JSON=/spec/openapi.yaml \
  -v "${PWD}:/spec" \
  swaggerapi/swagger-ui
```

Then open **http://localhost:8081**.

Select the **Kong proxy** server (`http://localhost:8000`) for unified routing, or individual `localhost:5xxx` servers for direct service access.

The Credit service exposes **GraphQL** at `http://localhost:5007/graphql` (with a built-in GraphiQL playground).

---

## Monitoring

| Dashboard | URL |
|---|---|
| Grafana | http://localhost:3000 (admin / admin) |
| Prometheus | http://localhost:9090 |
| Blackbox Exporter | http://localhost:9115 |
| RabbitMQ Management | http://localhost:15672 (guest / guest) |

The Grafana dashboard **TutorMatch — Service Health** is pre-provisioned and shows live service uptime, probe duration, and HTTP status for all 14 microservice health endpoints.

---

## Contributing Members

| Name | Role |
|---|---|
| Ewen | Slides, Credits Atomic, Make-Trial-Booking Composite, Get Interested Students Composite |
| Divyesh | Github Repo Merger, Indicate Interest composite, UI, KONG API Gateway |
| Dexter | Slides, Notification microservice, Continue Lesson composite, UI |
| Jia Le | Report, Cancel-Trial-Booking composite, Payment Outsystems |
| Zhi Xuan | Tutor Atomic + Student atomic microservice, Accept Student composite |
| Seth | Report, Trials atomic, Cancel-Trial-Lesson composite  |

2026 TutorMatch · ESD G7T1 · Singapore Management University
