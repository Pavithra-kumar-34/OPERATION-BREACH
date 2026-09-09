# DEFENDX — Blue Team Academy & Cybersecurity Operation Platform

DEFENDX is a defensive cybersecurity training academy and 2-person Blue Team cyber incident competition platform.

---

## Default Administrator Credentials

Immediately upon database initialization, the following administrator credentials are ready:

- **Email:** `pavithra09102007@gmail.com`
- **Password:** `DefendX2026`

---

## Key System Architecture

1. **Role-Based Architecture**:
   - **Administrator**: Global competition controls (Start, Pause, Resume, End, Reset), Team Roster Management, Real-time Analytics, Audit Trail Inspector, CSV Export (`defendx-results.csv`).
   - **Blue Team Analyst**: 2-Person collaborative live incident investigation, synchronized via WebSockets.
2. **DEFENDX Academy**: 14 Comprehensive cybersecurity modules with theory, guided tasks, interactive knowledge checks, adaptive recommendations, and printable official certification.
3. **6-Stage Server-Authoritative Incident Operation**:
   - `Stage 1: DETECT` — Identify root breach alert from SIEM queue.
   - `Stage 2: INVESTIGATE` — Inspect evidence chain, query authoritative IOCs, document findings, request tactical hints.
   - `Stage 3: ANALYZE` — Correlate adversary timeline and classify evidence as Suspicious/Benign.
   - `Stage 4: IDENTIFY` — Attack Type, Attack Vector, Affected Asset, Primary Threat IOC.
   - `Stage 5: RESPOND` — Containment and remediation planning with penalties for dangerous actions.
   - `Stage 6: REPORT` — Formal 11-section Incident Response Report for executive and technical sign-off.
4. **Authoritative 1000-Point Normalized Scoring Engine**: Computed server-side across detection, evidence inspection, classification accuracy, identification, containment efficacy, report completeness, and hint efficiency.
5. **Real-time Synchronizer**: WebSocket broadcasting between team partners (`/api/ws/team/{team_id}`).

---

## Local Development Setup

### 1. Backend Setup

```bash
cd backend
python -m pip install -r requirements.txt
python init_db.py
python -m uvicorn main:app --reload --port 8000
```

The backend will automatically create tables and seed default administrator, academy modules, scenarios, and sample teams.

### 2. Frontend Setup

In a new terminal window:

```bash
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

---

## Docker Compose Setup

Run the entire full-stack platform (PostgreSQL + FastAPI + React Vite) with a single command:

```bash
docker compose up --build
```

- **Frontend:** `http://localhost:5173`
- **Backend API Docs:** `http://localhost:8000/docs`
- **PostgreSQL:** `localhost:5432`

---

## Pre-Seeded Demonstration Squads

| Team Name | Team Code | Analyst 1 | Analyst 2 | Scenario |
|---|---|---|---|---|
| **Alpha Sentinel** | `DX-ALPHA1` | Alex Rivera | Jordan Vance | FinCore Phishing |
| **Cyber Vanguard** | `DX-VANG02` | Elena Rostova | Marcus Chen | HealthNet Ransomware |
| **Shadow Defense** | `DX-SHAD03` | David Kim | Sarah Connor | CloudGuard Supply Chain |

---

## Testing Verification

To run backend integration test verification:

```bash
python -m pytest backend/
# Or run inline verification:
python backend/init_db.py
```
