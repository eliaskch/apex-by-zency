"""
WebSocket Manager — gère les connexions par consultation_id.
Permet de notifier le frontend en temps réel du statut du pipeline IA.
"""
import json

import structlog
from fastapi import WebSocket

logger = structlog.get_logger()


class ConnectionManager:
    """Gère les connexions WebSocket actives par consultation_id."""

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, consultation_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if consultation_id not in self._connections:
            self._connections[consultation_id] = []
        self._connections[consultation_id].append(websocket)
        logger.info("ws.connected", consultation_id=consultation_id)

    def disconnect(self, consultation_id: str, websocket: WebSocket) -> None:
        if consultation_id in self._connections:
            self._connections[consultation_id] = [
                ws for ws in self._connections[consultation_id] if ws is not websocket
            ]
            if not self._connections[consultation_id]:
                del self._connections[consultation_id]
        logger.info("ws.disconnected", consultation_id=consultation_id)

    async def send_status(self, consultation_id: str, status: str, progress: int = 0) -> None:
        """Envoie un message de statut à tous les clients connectés pour cette consultation."""
        message = json.dumps({"status": status, "progress": progress})
        if consultation_id not in self._connections:
            return
        dead: list[WebSocket] = []
        for ws in self._connections[consultation_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(consultation_id, ws)


# Instance globale (importée par les routers et les tâches Celery)
manager = ConnectionManager()
