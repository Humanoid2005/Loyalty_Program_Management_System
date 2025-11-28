Loyalty Program Management System

This repository contains a full-stack application for managing a university loyalty/points program. The project includes a React + Vite frontend (TypeScript + Tailwind) in `client/` and a FastAPI backend in `server/` that uses MongoDB for persistence and supports Microsoft OAuth for authentication.

**Features**
- **Event Management**: Admins can create/update/delete events with point values and secret codes.
- **Volunteer Authorization**: Volunteers can be authorized for events and receive short-lived JWTs to mark team attendance via QR scans.
- **Team Management**: Participants can create/join teams, get a QR id and join codes, and teams accumulate points.
- **Leaderboard**: Top teams are returned via an API endpoint.
- **Secure Codes & Tokens**: Event secret codes are encrypted with AES-GCM server-side; volunteer actions use signed JWTs.

**Tech Stack**
- **Backend**: Python, FastAPI, Motor (MongoDB async driver), Starlette sessions, Authlib (OAuth client)
- **Frontend**: React + TypeScript, Vite, TailwindCSS
- **Database**: MongoDB

**Repository Structure (top-level)**
- **`client/`**: React + Vite frontend application
- **`server/`**: FastAPI backend with `main.py`, `config.py`, and `models.py`
- **`server/requirements.txt`**: Python dependencies for backend

**Prerequisites**
- **Node.js** (recommended v18+), and a package manager (`npm`/`pnpm`/`yarn`) to run the frontend
- **Python 3.10+** for the backend
- **MongoDB**: a cluster or local instance; connection info is provided via environment variables

**Important Environment Variables**
Create a `.env` in the `server/` directory (or set these in your environment). Keys referenced by `server/config.py`:
- `CLIENT_ID` — Microsoft OAuth client id
- `CLIENT_SECRET` — Microsoft OAuth client secret
- `TENANT_ID` — (optional) tenant id for OAuth
- `SESSION_SECRET_KEY` — secret used by Starlette SessionMiddleware (required)
- `ADMIN_EMAIL` — admin email address (default in code: `synergy@iiitb.ac.in`)
- `FRONTEND_URL` — frontend base URL (default `http://localhost:5173`)
- `BACKEND_URL` — backend base URL (default `http://localhost:8000`)
- `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `CLUSTER_NAME`, `DATABASE_NAME`, `APP_NAME` — MongoDB Atlas credentials and identifiers
- `DEADLINE_DATE` — optional string (ISO or `YYYY-MM-DD`) used to restrict team actions after a deadline
- `SECRET_KEY` — secret used for JWT signing and encryption key derivation

Ensure `SESSION_SECRET_KEY` and `SECRET_KEY` are set to strong, random values in production.

**Setup & Run (development)**

Backend (FastAPI)

1. Create and activate a virtual environment from the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install server dependencies and set up `.env` inside `server/`:

```bash
pip install -r server/requirements.txt
# create server/.env with the variables listed above
```

3. Run the backend dev server (from repository root):

```bash
# from repo root
uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (React + Vite)

1. Install dependencies and run the dev server:

```bash
cd client
npm install
npm run dev
```

2. Available frontend scripts (defined in `client/package.json`):

```bash
npm run dev     # start Vite dev server
npm run build   # build production bundle
npm run preview # preview production build
npm run lint    # run eslint
```

**Key Backend Endpoints**
- `GET /api/health` — simple health check
- `GET /auth/login` — start Microsoft OAuth login flow
- `GET /api/auth` — OAuth callback (expects `code` query param)
- `GET /api/user/profile` — returns current session user
- `POST /api/events` — create event (admin)
- `GET /api/events` — list events (requires auth)
- `PUT /api/events/{event_id}` — update event (admin)
- `DELETE /api/events/{event_id}` — delete event (admin)
- `POST /api/volunteers` — add volunteer (admin)
- `GET /api/volunteers` — list volunteers (admin/volunteer)
- `POST /api/create_team` — create a team (participant)
- `POST /api/join_team_by_code` — join a team by join code
- `GET /api/my_team` — fetch the current user's team
- `POST /api/volunteer/authorize` — volunteer authorizes for an event with secret (returns short-lived JWT)
- `POST /api/volunteer/scan` — volunteer uses JWT to scan a team's QR and award points
- `GET /api/leaderboard/full` — top teams leaderboard

Notes:
- The server uses `SessionMiddleware` to store session cookies. CORS is configured using `FRONTEND_URL` from `server/config.py`.
- Event secret codes are encrypted/decrypted server-side using AES-GCM (see `server/main.py`). The server also issues short-lived JWTs for volunteer event authorization.
- OAuth flow restricts sign-ins to `@iiitb.ac.in` addresses by default — check the logic in `server/main.py`.

**Security & Production Notes**
- Don't commit `.env` or secret values. Use a secrets manager in production.
- Use HTTPS and set `FRONTEND_URL` and `BACKEND_URL` to production origins.
- Ensure `SESSION_SECRET_KEY` and `SECRET_KEY` are long random strings.
- If using MongoDB Atlas, whitelist your server IP or configure VPC peering.

**Contributing**
- Fork the repository and open a pull request describing your changes.
- Keep code style consistent with TypeScript/React (client) and PEP8 for Python (server).

**Getting Help / Troubleshooting**
- If you see MongoDB connection issues, verify `MONGODB_USERNAME`, `MONGODB_PASSWORD`, and `CLUSTER_NAME` in your `.env` and ensure your network allows DNS resolution for the Atlas cluster.
- Use `/api/debug/session` endpoint to inspect session and CORS headers during development.
