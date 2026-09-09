import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("defendx.websocket")

class ConnectionManager:
    def __init__(self):
        # Map of team_id -> Set of active WebSocket connections
        self.active_team_connections: Dict[int, Set[WebSocket]] = {}
        # Set of active admin WebSocket connections
        self.active_admin_connections: Set[WebSocket] = set()

    async def connect_team(self, team_id: int, websocket: WebSocket):
        await websocket.accept()
        if team_id not in self.active_team_connections:
            self.active_team_connections[team_id] = set()
        self.active_team_connections[team_id].add(websocket)
        logger.info(f"WebSocket connected for team {team_id}. Active: {len(self.active_team_connections[team_id])}")

    def disconnect_team(self, team_id: int, websocket: WebSocket):
        if team_id in self.active_team_connections:
            self.active_team_connections[team_id].discard(websocket)
            if not self.active_team_connections[team_id]:
                del self.active_team_connections[team_id]
        logger.info(f"WebSocket disconnected for team {team_id}.")

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.active_admin_connections.add(websocket)
        logger.info(f"WebSocket connected for admin. Total admins: {len(self.active_admin_connections)}")

    def disconnect_admin(self, websocket: WebSocket):
        self.active_admin_connections.discard(websocket)
        logger.info("WebSocket disconnected for admin.")

    async def broadcast_to_team(self, team_id: int, message: dict):
        """Sends real-time updates to all analysts connected to a specific team room."""
        if team_id in self.active_team_connections:
            dead_connections = set()
            for connection in self.active_team_connections[team_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Error sending message to team WS: {e}")
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.active_team_connections[team_id].discard(dead)

    async def broadcast_to_admins(self, message: dict):
        """Sends real-time updates to all connected administrators."""
        dead_connections = set()
        for connection in self.active_admin_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending message to admin WS: {e}")
                dead_connections.add(connection)
        for dead in dead_connections:
            self.active_admin_connections.discard(dead)

    async def broadcast_all(self, message: dict):
        """Broadcasts a global message to all teams and admins."""
        for team_id in list(self.active_team_connections.keys()):
            await self.broadcast_to_team(team_id, message)
        await self.broadcast_to_admins(message)

manager = ConnectionManager()
