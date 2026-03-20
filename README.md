# ESD G7T1 — Tutor Matching Platform

A microservices-based platform that connects students directly with tutors, reducing reliance on expensive tuition centres and fragmented Telegram channels.

---

## Table of Contents

- [Business Problem](#business-problem)
- [Solution Overview](#solution-overview)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [User Scenarios](#user-scenarios)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Branching Strategy](#branching-strategy)
- [Team](#team)

---

## Business Problem

Tuition costs in Singapore are rising due to high demand and a fragmented marketplace. Existing Telegram channels that connect tutors to students are disorganised — students often get ghosted with no follow-up. This platform addresses that by providing a structured, automated matchmaking system.

---

## Solution Overview

**Tutor Matching Platform** allows students to browse tutors, indicate interest, coordinate trial lesson bookings, and make payments — all in one place. Tutors receive automated notifications and can manage their availability.

---

## Architecture

- **Synchronous HTTP (REST)** — direct service-to-service calls where an immediate response is needed
- **Asynchronous messaging (AMQP via RabbitMQ)** — event-driven flows like notifications and booking coordination
- **Orchestration** — Booking service coordinates the payment flow
- **Choreography** — Services react independently to RabbitMQ events in the interest acceptance flow
- **KONG API Gateway** — single entry point for all client requests

---

## Microservices

| Service | Type | Port | Responsibility |
|---|---|---|---|
| `tutor` | Atomic | 5001 | Stores and serves tutor profiles |
| `student` | Atomic | 5002 | Stores and serves student profiles |
| `interest` | Atomic | 5003 | Manages interest requests (PENDING / ACCEPTED / EXPIRED) |
| `booking` | Atomic + Orchestrator | 5004 | Manages lesson bookings and orchestrates payment |
| `payment` | Atomic | 5005 | Processes payments via mock payment gateway |
| `notification` | Atomic | 5006 | Consumes RabbitMQ events and sends email/SMS |
| `indicate-interest` | Composite | 5010 | Handles Scenario 1 — student selects a tutor |

---

## User Scenarios

### Scenario 1 — Student Indicates Interest
Student browses tutors → selects one → composite service saves a PENDING interest record → publishes `InterestCreated` to RabbitMQ → Notification service emails the tutor. If the tutor does not reply within 48 hours, the interest record is automatically set to EXPIRED.

### Scenario 2 — Tutor Reviews and Accepts Student (Choreography)
Tutor reviews pending requests → accepts a student and proposes dates → Interest service publishes `InterestAccepted` to RabbitMQ → Booking service creates a `PENDING_STUDENT_CONFIRMATION` record → Notification service emails the student to select a date.

### Scenario 3 — Booking Confirmation and Payment (Orchestration)
Student views proposed dates → selects a date → Booking service locks the slot as `PENDING_PAYMENT` → orchestrates a synchronous call to Payment service → mock payment gateway processes the transaction → on success, Booking publishes `LessonConfirmed` → Notification service sends calendar invites to both parties.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Microservices | Python / Flask |
| Message Broker | RabbitMQ (AMQP) |
| API Gateway | KONG |
| Frontend / UI | OutSystems |
| Containerisation | Docker + Docker Compose |
| Database | Supabase (hosted PostgreSQL) |
| External APIs | Mock Payment Gateway, SMTP Email |

---

## Project Structure

```
esd-g7t1/
├── services/
│   ├── tutor/
│   │   ├── tutor.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── student/
│   │   ├── student.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── interest/
│   │   ├── interest.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── booking/
│   │   ├── booking.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── payment/
│   │   ├── payment.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── notification/
│   │   ├── notification.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── indicate-interest/
│       ├── indicate_interest.py
│       ├── requirements.txt
│       └── Dockerfile
├── diagrams/
│   ├── scenario1.drawio
│   ├── scenario2a.drawio
│   ├── scenario2b.drawio
│   ├── scenario2c.drawio
│   ├── scenario3a.drawio
│   └── scenario3b.drawio
├── docs/
│   ├── ESD_G7T1_Proposal.pptx
│   └── ESD_G7T1_Report.docx
├── docker-compose.yml
├── .gitignore
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/esd-g7t1.git
cd esd-g7t1
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Open .env and fill in your actual values
```

### 3. Start all services

```bash
docker-compose up --build
```

### 4. Stop all services

```bash
docker-compose down
```

### 5. Check RabbitMQ dashboard

Open [http://localhost:15672](http://localhost:15672) in your browser. Login with `guest / guest`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. **Never commit `.env`** — it is in `.gitignore`.

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anon/public key |
| `RABBITMQ_HOST` | Use `rabbitmq` inside Docker, `localhost` outside |
| `PAYMENT_GATEWAY_API_KEY` | Sandbox key for mock payment gateway |
| `SMTP_USER` / `SMTP_PASS` | Gmail credentials for notification service |

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready. Requires PR + 1 approval to merge. |
| `dev` | Integration branch. All features merge here first via PR. |
| `feature/<name>` | Your working branch. Branch off `dev`, PR back to `dev`. |

**Never commit directly to `main` or `dev`.**

```bash
# Start a new feature
git checkout dev
git pull origin dev
git checkout -b feature/your-service-name

# When done
git push -u origin feature/your-service-name
# Open a PR on GitHub: feature/your-name → dev
```

---

## Team

| Name | Role |
|---|---|
| TBC | Service: Tutor |
| TBC | Service: Student |
| TBC | Service: Interest |
| TBC | Service: Booking + Payment |
| TBC | Service: Notification |
| TBC | Service: Indicate Interest (Composite) |
| TBC | GitHub PIC + Docker Compose + DevOps |
