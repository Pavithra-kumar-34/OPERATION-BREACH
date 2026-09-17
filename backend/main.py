import sys
import os

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal, migrate_additive_schema
from seed import seed_database
from auth import decode_token
from websocket import manager
from routes import (
    auth as auth_routes,
    academy as academy_routes,
    scenarios as scenarios_routes,
    operation as operation_routes,
    leaderboard as leaderboard_routes,
    admin as admin_routes
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("defendx.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed Data on Startup
    logger.info("Initializing database tables and seed data...")
    Base.metadata.create_all(bind=engine)
    migrate_additive_schema()
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("DEFENDX Database initialized and seeded successfully.")
    except Exception as e:
        logger.error(f"Error during startup database seeding: {e}")
    finally:
        db.close()
    yield
    logger.info("Shutting down DEFENDX Backend.")

app = FastAPI(
    title="DEFENDX — Blue Team Academy + Cybersecurity Operation Platform",
    version="1.0.0",
    lifespan=lifespan
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API Routers
app.include_router(auth_routes.router)
app.include_router(academy_routes.router)
app.include_router(scenarios_routes.router)
app.include_router(operation_routes.router)
app.include_router(leaderboard_routes.router)
app.include_router(admin_routes.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "DEFENDX Backend Core",
        "database": "CONNECTED",
        "version": "1.0.0"
    }

# ----------------- REAL-TIME WEBSOCKET ENDPOINTS -----------------
@app.websocket("/api/ws/team/{team_id}")
@app.websocket("/ws/team/{team_id}")
async def team_websocket_endpoint(
    websocket: WebSocket,
    team_id: int,
    token: str = Query(None)
):
    # Validate token if supplied
    user_info = None
    if token:
        try:
            user_info = decode_token(token)
        except Exception:
            logger.warning(f"WebSocket auth failed for team {team_id}")

    await manager.connect_team(team_id, websocket)
    try:
        # Notify initial connection acknowledgment
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "team_id": team_id,
            "status": "REALTIME LIVE",
            "message": "Connected to DEFENDX Real-Time Synchronizer"
        })

        while True:
            data = await websocket.receive_json()
            # Handle client-initiated ping or custom events
            msg_type = data.get("type", "PING")
            if msg_type == "PING":
                await websocket.send_json({"type": "PONG"})
            elif msg_type == "PARTNER_TYPING":
                await manager.broadcast_to_team(team_id, {
                    "type": "PARTNER_TYPING",
                    "analyst": data.get("analyst", "Partner"),
                    "field": data.get("field")
                })
    except WebSocketDisconnect:
        manager.disconnect_team(team_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for team {team_id}: {e}")
        manager.disconnect_team(team_id, websocket)

@app.websocket("/api/ws/admin")
@app.websocket("/ws/admin")
async def admin_websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    if token:
        try:
            user_info = decode_token(token)
            if user_info.get("role") != "ADMIN":
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect_admin(websocket)
    try:
        await websocket.send_json({
            "type": "ADMIN_CONNECTION_ESTABLISHED",
            "status": "ADMIN LIVE"
        })
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
    except Exception as e:
        manager.disconnect_admin(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
