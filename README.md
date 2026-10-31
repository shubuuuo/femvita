# FemVita

**A full-stack women's health web app: cycle tracking, phase-aware wellness, and a moderated, privacy-minded community.**

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)

> **Disclaimer.** FemVita shares general information and calendar-method estimates. It is not a medical device, it does not diagnose anything, and its predictions must not be used for contraception or medical decisions. Talk to a clinician about health concerns.


**Live demo:** https://femvita.vercel.app

| Dashboard | Cycle Tracker |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Cycle Tracker](docs/screenshots/cycle-tracker.png) |
| **Wellness Hub** | **Community** |
| ![Wellness Hub](docs/screenshots/wellness-hub.png) | ![Community](docs/screenshots/community.png) |

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [How the cycle predictions work](#how-the-cycle-predictions-work)
- [Security and privacy](#security-and-privacy)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Data sources and credits](#data-sources-and-credits)
- [Author](#author)
- [License](#license)

---

## Features

### Accounts and security
- Email and password registration and sign-in, with sign-out and session expiry.
- Passwords hashed with **argon2id**; sessions are random tokens in **httpOnly** cookies, stored server-side only as a SHA-256 hash.
- Rate limiting on login, registration and password checks.
- Route protection in Next.js, plus automatic redirect to sign-in when a session expires.

### Dashboard
- **Cycle hero** with today's cycle day, current phase, a colour-coded phase ribbon, and estimates for the next period, ovulation and the fertile window. It handles the "no data yet" and "period is late" cases explicitly.
- **Daily tip** that follows your current phase (changes once per day).
- **Sleep, water and steps cards** backed by a `daily_metrics` table: a seven-day sleep chart, a water cup with one-tap +250 ml (atomic, race-safe), and a steps donut.
- **Community highlight** (the most supported thread this week) and a **featured health article** from MedlinePlus.
- **Notification bell** with computed reminders: period approaching, fertile window opening, estimated ovulation, and a daily log reminder.

### Cycle Tracker
- Monthly calendar showing logged period days, predicted period days, the fertile window and the estimated ovulation day.
- Daily log: flow intensity, mood, symptoms, basal body temperature (°C) and cervical mucus.
- 30-day BBT trend mapped onto cycle days.
- Summary of average cycle length, average period length, cycle day and days late.

### Wellness Hub
- **Nutrition:** phase-based meal ideas from TheMealDB with a vegetarian toggle and full recipe detail. Picks stay stable for the day.
- **Gentle moves:** low-impact exercises from the wger exercise library with muscles, equipment and image credits.
- **Knowledge base:** searchable health topics from MedlinePlus.
- **Weekly hydration challenge** with Monday-to-Sunday check-ins, and short guided mindfulness sessions.

### Community
- Tagged discussion feed with cursor pagination, replies, supports (likes) and private bookmarks.
- **Anonymous posting.** Other members never see who wrote an anonymous post or reply. The real author is kept so moderators can act on abuse.
- **Support groups** with their own feeds, and a **daily poll** whose results stay hidden until you vote. One vote per person is enforced by the database.
- **Reporting and moderation:** members can report posts and replies (harassment, medical misinformation, self-harm concern, spam, other). Moderators work from a queue and can hide or restore content, with self-harm-related reports flagged.

### Profile and privacy controls
- Edit your name, username and birthday; change your password (this signs out your other devices).
- Seven-day sleep and activity charts, and a monthly steps total.
- Notification preferences (cycle alerts, daily log reminder).
- **Export your data** as JSON, plus your cycle logs as CSV.
- **Delete your account.** It requires your password and permanently removes everything linked to you, using database-level cascades.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack, React Compiler), React, TypeScript, Tailwind CSS, pnpm |
| Backend | FastAPI, Pydantic v2 and pydantic-settings, SQLAlchemy 2, Alembic, psycopg 3, httpx |
| Database | PostgreSQL |
| Auth | argon2-cffi (argon2id), server-side sessions, httpOnly cookies |
| External data | MedlinePlus, TheMealDB, wger (called by the backend only, with caching) |
| Suggested hosting | Vercel (frontend), Render (backend), Neon (PostgreSQL) |

---

## Architecture

```mermaid
flowchart LR
    B[Browser] -->|HTTPS| N[Next.js frontend]
    N -->|"/api/* rewrite (same origin)"| F[FastAPI backend]
    F --> P[(PostgreSQL)]
    F -. cached .-> M[MedlinePlus]
    F -. cached .-> T[TheMealDB]
    F -. cached .-> W[wger]
```

Key design decisions:

- **Same-origin API.** The browser only ever talks to the Next.js site. A rewrite forwards `/api/*` to FastAPI, so the session cookie belongs to one origin and no CORS or third-party cookie configuration is needed.
- **The browser never calls third-party APIs.** FastAPI fetches MedlinePlus, TheMealDB and wger, caches the results in memory (12 to 24 hours), strips HTML and returns clean JSON.
- **Pure cycle logic.** All cycle maths lives in `cycle_logic.py` with no database or framework imports, so it is easy to unit-test and reason about.
- **The database enforces the rules.** Unique constraints, `CHECK` constraints on metric ranges, and `ON DELETE CASCADE` keep data consistent even if application code has a bug.
- **Race-safe writes.** Water intake uses a single `INSERT ... ON CONFLICT DO UPDATE` with the total clamped inside the database, so double-clicks and multiple tabs cannot corrupt the count.
- **Timezone-aware "today".** The frontend sends its timezone (`?tz=`) with every request, so "today" means the user's today.

---

## How the cycle predictions work

FemVita uses the **calendar method**, a simple estimate from your own logged periods:

1. Logged flow days are grouped into periods. A gap of more than 7 flow-free days starts a new period.
2. Your average cycle length is the mean of your **last 6 cycles**, ignoring lengths outside **21 to 45 days** (missed logs or spotting). Until you have a valid cycle, a default of 28 days is used.
3. The average period length is calculated the same way (valid range 1 to 10 days, default 5).
4. The luteal phase is assumed to last **14 days**, so **ovulation ≈ cycle length − 14**.
5. The **fertile window** is estimated as the 5 days before ovulation through the day after.
6. Phases (menstrual, follicular, ovulatory, luteal) are derived from the cycle day. If your period is later than predicted, the day count keeps going rather than wrapping, and the app says the period is late instead of guessing a phase.

These are estimates. Real cycles vary, and the app says so wherever predictions appear.

---

## Security and privacy

| Area | What is implemented |
|---|---|
| Passwords | argon2id hashing; hashes upgraded automatically if parameters change; a dummy hash is checked for unknown emails so response time does not reveal which emails exist |
| Sessions | 32-byte random tokens; only the SHA-256 hash is stored; `HttpOnly`, `SameSite=Lax` and `Secure` (in production) cookie; 30-day expiry; logging out deletes the session |
| Brute force | 5 failed logins per email per 15 minutes (plus a looser per-IP limit), registration limits, and limits on "current password" checks |
| Authorization | Every data endpoint is scoped to the signed-in user; moderation endpoints require an admin flag set directly in the database |
| Anonymity | Anonymous posts and replies hide identity from other members only. Moderators can see the real author |
| Your data | One-click export; account deletion removes all linked records through database cascades |
| Hardening | Interactive API docs can be disabled in production (`DOCS_ENABLED=false`); the password hash is never included in any API response |

See [Known limitations](#known-limitations) for what is **not** covered.

---

## Getting started

### Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io/)
- Python 3.10+ (developed on 3.12)
- PostgreSQL 14+ running locally, or a managed database such as Neon

### 1. Clone

```bash
git clone https://github.com/shubuuuo/femvita.git
cd femvita
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        
pip install -r requirements.txt
```

Create `backend/.env` (see [Configuration](#configuration)), then create the database schema:

```bash
python -c "from app.database import engine, Base; import app.models; Base.metadata.create_all(engine)"
alembic stamp head
```

> The migration history begins from an existing schema, so a **fresh** database is created from the models and then stamped as up to date. Future schema changes use normal Alembic migrations (`alembic revision --autogenerate`, then `alembic upgrade head`). A baseline migration is on the [roadmap](#roadmap).

Optionally load the starter community data (support groups and a batch of daily polls, run it again every few weeks for more polls):

```bash
python seed_community.py
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: <http://localhost:8000/docs>

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open <http://localhost:3000>. By default the frontend forwards `/api/*` to `http://localhost:8000`.

### 4. Create your account and a moderator

Register at `/register`. To make an account a moderator, run this against your database:

```sql
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```

### Optional: check the external APIs

```bash
cd backend
python probe_apis.py
```

This verifies that the ingredient and exercise search terms still return results from TheMealDB and wger.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | none | SQLAlchemy URL, e.g. `postgresql+psycopg://user:password@localhost:5432/femvita` |
| `FRONTEND_ORIGIN` | no | `http://localhost:3000` | Allowed browser origin (CORS) |
| `COOKIE_SECURE` | no | `false` | Set `true` when serving over HTTPS |
| `SESSION_DAYS` | no | `30` | Session lifetime in days |
| `DOCS_ENABLED` | no | `true` | Set `false` in production to hide `/docs` |
| `THEMEALDB_KEY` | no | `1` | TheMealDB key (`1` is their shared test key; use your own for real traffic) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_URL` | no | `http://localhost:8000` | Where Next.js forwards `/api/*`. Read at **build** time, so redeploy after changing it |

Never commit `.env` or `.env.local`. Commit an `.env.example` with placeholder values instead.

---

## Project structure

```
femvita/
├── backend/
│   ├── alembic/                  # migrations
│   ├── app/
│   │   ├── main.py               # app, CORS, router registration, health check
│   │   ├── config.py             # settings from environment variables
│   │   ├── database.py           # engine and session
│   │   ├── models.py             # SQLAlchemy models and constraints
│   │   ├── schemas.py            # Pydantic request/response models
│   │   ├── security.py           # password hashing, session tokens
│   │   ├── throttle.py           # in-memory rate limiter
│   │   ├── deps.py               # auth, admin and "today" dependencies
│   │   ├── cycle_logic.py        # pure cycle maths (no DB, no framework)
│   │   ├── routers/              # auth, users, cycle, metrics, dashboard, wellness,
│   │   │                         # community, poll, admin, notifications, preferences
│   │   └── services/             # MedlinePlus, TheMealDB, wger clients + cache
│   ├── seed_community.py         # groups and daily polls
│   └── probe_apis.py             # external API sanity check
└── frontend/
    └── src/
        ├── app/                  # pages: dashboard, cycle-tracker, wellness-hub,
        │                         # community, profile, login, register
        ├── components/           # shared UI (Card, NotificationBell, UserMenu, Shell)
        ├── lib/                  # api client, shared types, events
        └── proxy.ts              # route protection
```

---

## API overview

All endpoints are under `/api` and, except `auth/*` and `health`, require a signed-in user. Run the backend and open `/docs` for the full, interactive reference.

| Prefix | Purpose |
|---|---|
| `/api/auth` | register, login, logout, current session |
| `/api/me` | profile (GET, PATCH), change password, export data, delete account |
| `/api/preferences` | notification preferences |
| `/api/cycle` | summary, calendar month, BBT trend |
| `/api/logs/{date}` | save or clear a day's log |
| `/api/metrics` | seven-day sleep, steps and water; add water; month steps; set a day's sleep and steps |
| `/api/dashboard` | daily tip, community highlight, featured article |
| `/api/notifications` | computed reminders for the bell |
| `/api/wellness` | health topics, nutrition, meal detail, gentle moves, weekly challenge |
| `/api/community` | posts, replies, supports, bookmarks, reports, groups |
| `/api/community/poll` | today's poll and voting |
| `/api/admin` | moderation queue (admins only) |

---

## Deployment

A simple, low-cost setup where the browser only talks to one site:

- **Database:** a managed PostgreSQL (for example Neon). Create the schema as in [Getting started](#2-backend) and enable automated backups.
- **Backend:** a Python web service (for example Render) with root directory `backend`.
  - Build command: `pip install -r requirements.txt`
  - Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
  - Health check path: `/api/health`
  - Environment: `DATABASE_URL`, `FRONTEND_ORIGIN` (your site's URL), `COOKIE_SECURE=true`, `DOCS_ENABLED=false`
- **Frontend:** Vercel with root directory `frontend`, and `API_URL` set to the backend's public URL (no trailing slash, no `/api`) **before** the first build.

After deploying, register an account, make it a moderator with the SQL above, and check the cookie is `HttpOnly` and `Secure` and that `/docs` returns 404.

Free hosting tiers often put idle backends to sleep, so the first request after a quiet period can be slow. Check each provider's current limits and terms before relying on a free plan for real users.

---

## Known limitations

FemVita is a portfolio and learning project. Before real people entrust it with health data, these gaps should be closed:

- **No email verification or password reset.** A forgotten password cannot be recovered by the user.
- **No multi-factor authentication.**
- **Rate limiting is in memory.** It resets on restart and is per server process. A shared store (for example Redis) is needed to run several instances.
- **No automated test suite or CI yet.**
- **Not end-to-end encrypted and not HIPAA-compliant.** Data is protected in transit by HTTPS and at rest by the hosting provider. Do not claim more than that.
- **Calendar-method predictions are estimates** and are not suitable for contraception or diagnosis.
- **Wellness content is general information.** Cycle-syncing advice in particular has limited evidence; the app presents it as inspiration, not a prescription.
- **Steps and sleep are entered by hand.** There is no device or wearable sync.

---

## Roadmap

- [ ] Baseline Alembic migration so a fresh database can be created with `alembic upgrade head`
- [ ] Email verification, password reset and optional MFA
- [ ] Automated tests (starting with the pure cycle logic and auth) and a CI workflow
- [ ] Docker Compose for one-command local setup
- [ ] Shared rate limiting (Redis) and error monitoring
- [ ] Optional email or push notifications
- [ ] Self-managed supplement and medication reminders
- [ ] Wearable and device sync

---

## Data sources and credits

- **[MedlinePlus](https://medlineplus.gov/)** (U.S. National Library of Medicine) for health topic summaries. FemVita displays this information with attribution; it is not endorsed by or affiliated with MedlinePlus or the NLM.
- **[TheMealDB](https://www.themealdb.com/)** for recipes.
- **[wger Workout Manager](https://wger.de/)** for exercise data and images. Content is Creative Commons licensed and licences vary per item, so check the specific terms before redistributing, and keep the author credit shown in the app.

---

## Author

**Shubham Maurya**, B.Tech Computer Engineering student, Pune.

- GitHub: [@shubuuuo](https://github.com/shubuuuo)
- LinkedIn: [shubham-maurya](https://www.linkedin.com/in/shubham-maurya-425660235/)

---

## License

Released under the MIT License. See [`LICENSE`](LICENSE) for details.
