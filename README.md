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
- [Team](#team)

---

## Business Problem

Tuition costs in Singapore are rising due to high demand and a fragmented marketplace. Existing Telegram channels that connect tutors to students are disorganised — students often get ghosted with no follow-up. This platform addresses that by providing a structured, automated matchmaking system.

---

## Solution Overview

**Tutor Matching Platform** allows students to browse tutors, indicate interest, coordinate trial lesson bookings, and make payments — all in one place. Tutors receive automated notifications and can manage their availability. The platform uses event-driven microservices so each step happens reliably and asynchronously.

---

## Architecture

The system is built on a microservices architecture using:

- **Synchronous HTTP (REST)** for direct service-to-service calls where an immediate response is needed
- **Asynchronous messaging (AMQP via RabbitMQ)** for event-driven flows like notifications and booking coordination
- **Orchestration** in the Booking service (coordinates payment flow)
- **Choreography** in the Interest acceptance flow (services react independently to RabbitMQ events)
- **KONG API Gateway** as the single entry point for all client requests

---

## Microservices

| Service | Type | Responsibility |
|---|---|---|
| `tutor` | Atomic | Stores and serves tutor profiles |
| `student` | Atomic | Stores and serves student profiles |
| `interest` | Atomic | Manages interest requests (PENDING / ACCEPTED / EXPIRED) |
| `booking` | Atomic + Orchestrator | Manages lesson bookings and orchestrates payment |
| `payment` | Atomic | Processes payments via mock payment gateway |
| `notification` | Atomic | Consumes RabbitMQ events and sends email/SMS alerts |
| `indicate-interest` | Composite | Handles Scenario 1 — student selects a tutor |

---

## User Scenarios

### Scenario 1 — Student Indicates Interest
Student browses tutors → selects one → composite service saves a PENDING interest record → publishes `InterestCreated` to RabbitMQ → Notification service emails the tutor. If the tutor does not reply within 48 hours, the interest record is automatically set to EXPIRED.

### Scenario 2 — Tutor Reviews and Accepts Student (Choreography)
Tutor reviews pending requests → accepts a student and proposes dates → Interest service publishes `InterestAccepted` to RabbitMQ → Booking service creates a `PENDING_STUDENT_CONFIRMATION` record → Notification service emails the student to select a date.

### Scenario 3 — Booking Confirmation and Payment (Orchestration)
Student views proposed dates → selects a date → Booking service locks the slot as `PENDING_PAYMENT` → orchestrates a synchronous call to Payment service → mock payment gateway processes the transaction → on success, Booking service sets status to `CONFIRMED` and publishes `LessonConfirmed` → Notification service sends calendar invites to both parties.

**Cancellation paths:**
- Student cancels → Booking service frees slot → publishes `TrialCancelled` → tutor is notified
- Tutor cancels after confirmation → student is notified and refund is issued

---

## Tech Stack

| Layer | Technology |
|---|---|
| Microservices | Python / Flask |
| Message Broker | RabbitMQ (AMQP) |
| API Gateway | KONG |
| Frontend / UI | OutSystems |
| Containerisation | Docker + Docker Compose |
| Database | PostgreSQL (one DB per service) |
| External APIs | Mock Payment Gateway, SMTP Email |

---

## Project Structure

```
esd-g7t1/
├── services/
│   ├── tutor/                  # Atomic — tutor profiles
│   │   ├── tutor.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── student/                # Atomic — student profiles
│   │   ├── student.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── interest/               # Atomic — interest records
│   │   ├── interest.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── booking/                # Atomic + Orchestrator
│   │   ├── booking.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── payment/                # Atomic — payment processing
│   │   ├── payment.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── notification/           # Atomic — email/SMS via RabbitMQ
│   │   ├── notification.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── indicate-interest/      # Composite — Scenario 1
│       ├── indicate_interest.py
│       ├── requirements.txt
│       └── Dockerfile
├── diagrams/                   # .drawio scenario diagrams
│   ├── scenario1.drawio
│   ├── scenario2a.drawio
│   ├── scenario2b.drawio
│   ├── scenario2c.drawio
│   ├── scenario3a.drawio
│   └── scenario3b.drawio
├── docs/                       # Report, proposal, and supporting docs
│   ├── ESD_G7T1_Proposal.pptx
│   └── ESD_G7T1_Report.docx
├── docker-compose.yml          # Orchestrates all services + RabbitMQ
├── .gitignore
├── .env.example                # Copy to .env and fill in your values
└── README.md
```

---

## Getting Started

### Prerequisites

Make sure you have installed:
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

This will spin up RabbitMQ and all microservices together. Each service runs on its own port as defined in `docker-compose.yml`.

### 4. Stop all services

```bash
docker-compose down
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. **Never commit the `.env` file** — it is already in `.gitignore`.

Key variables you need to configure:

| Variable | Description |
|---|---|
| `RABBITMQ_HOST` | Hostname for RabbitMQ (use `rabbitmq` inside Docker) |
| `PAYMENT_GATEWAY_API_KEY` | Sandbox API key for the mock payment gateway |
| `SMTP_USER` / `SMTP_PASS` | Gmail credentials for the notification service |
| `*_DB_URL` | PostgreSQL connection string per service |

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only. Requires PR + approval to merge. |
| `dev` | Integration branch. All features merge here first via PR. |
| `feature/<name>` | Your working branch. Branch off `dev`, PR back to `dev`. |

**Never commit directly to `main` or `dev`.**

```bash
# Starting a new feature
git checkout dev
git pull origin dev
git checkout -b feature/your-service-name

# When done
git push -u origin feature/your-service-name
# Then open a Pull Request on GitHub: feature/your-name → dev
```

---

## Team

| Name | Role |
|---|---|
| Ewen| Service: Tutor + Student |
| Dexter| Service: Interest + Indicate Interest composite |
| Zhi Xuan | Service: Booking + Payment |
| Jia Le | Service: Notification + RabbitMQ setup |
| Sef | OutSystems UI + KONG API Gateway |
| Divyesh | GitHub PIC + Docker Compose + DevOps |
