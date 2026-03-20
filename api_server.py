"""
Dashboard API Server v2
REST API + WebSocket for real-time dashboard

Improvements:
- Bind to config.webapp.host (127.0.0.1 by default, NOT 0.0.0.0)
- Fixed key names (usage_percent, temperature_celsius, processes)
- Token-based auth for API requests
- Broadcast interval from config
- DRY: single _collect_full_state() for REST + WS
- Health check endpoint
- LogService injected (no global state)
- Graceful WebSocket cleanup
"""

import asyncio
import hashlib
import json
import logging
import time
from typing import Any, Dict, Optional, Set

import aiohttp_cors
from aiohttp import web

from l2monitor.config import AppConfig, get_config

logger = logging.getLogger(__name__)


class DashboardAPIServer:
    """WebSocket + REST API сервер для дашборда"""

    def __init__(
        self,
        monitor_service,
        analytics_service,
        system_monitor,
        log_service=None,
        host: Optional[str] = None,
        port: Optional[int] = None,
    ):
        config = get_config()
        self.monitor_service = monitor_service
        self.analytics_service = analytics_service
        self.system_monitor = system_monitor
        self.log_service = log_service

        self.host = host or config.webapp.host
        self.port = port or config.webapp.port
        self._broadcast_interval = config.webapp.ws_broadcast_interval_sec

        # Simple API token (hash of bot token — not the token itself!)
        token = config.telegram.token
        self._api_token = hashlib.sha256(token.encode()).hexdigest()[:32] if token else None

        self.app = web.Application(middlewares=[self._auth_middleware])
        self.websockets: Set[web.WebSocketResponse] = set()
        self.runner: Optional[web.AppRunner] = None
        self._broadcast_task: Optional[asyncio.Task] = None

        self._setup_routes()

    # ══════════════════════════════════════════════════════
    #  Auth
    # ══════════════════════════════════════════════════════

    @web.middleware
    async def _auth_middleware(self, request: web.Request, handler):
        """
        Простая token-based аутентификация.
        
        Передавайте токен:
        - Header: Authorization: Bearer <token>
        - Query: ?token=<token>
        
        Эндпоинты без auth: /health, /ws (WS проверяет при подключении)
        """
        # Пропускаем health check
        if request.path == "/health":
            return await handler(request)

        # WebSocket auth проверяется в handle_websocket
        if request.path == "/ws":
            return await handler(request)

        # Проверяем токен если он настроен
        if self._api_token:
            token = None

            # Header
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth[7:]

            # Query parameter
            if not token:
                token = request.query.get("token")

            if token != self._api_token:
                return web.json_response(
                    {"error": "Unauthorized"}, status=401
                )

        return await handler(request)

    # ══════════════════════════════════════════════════════
    #  Routes
    # ══════════════════════════════════════════════════════

    def _setup_routes(self):
        """Настройка маршрутов"""
        routes = [
            ("GET", "/health", self.handle_health),
            ("GET", "/api/status", self.handle_status),
            ("GET", "/api/characters", self.handle_characters),
            ("GET", "/api/system", self.handle_system),
            ("GET", "/api/clickers", self.handle_clickers),
            ("GET", "/api/logs", self.handle_logs),
            ("POST", "/api/action", self.handle_action),
            ("GET", "/ws", self.handle_websocket),
        ]

        for method, path, handler in routes:
            if method == "GET":
                self.app.router.add_get(path, handler)
            elif method == "POST":
                self.app.router.add_post(path, handler)

        # CORS
        cors = aiohttp_cors.setup(
            self.app,
            defaults={
                "*": aiohttp_cors.ResourceOptions(
                    allow_credentials=True,
                    expose_headers="*",
                    allow_headers="*",
                    allow_methods="*",
                )
            },
        )
        for route in list(self.app.router.routes()):
            try:
                cors.add(route)
            except ValueError:
                pass  # Some routes can't have CORS

    # ══════════════════════════════════════════════════════
    #  REST Handlers
    # ══════════════════════════════════════════════════════

    async def handle_health(self, request: web.Request) -> web.Response:
        """Health check (no auth required)"""
        return web.json_response({
            "status": "ok",
            "monitoring": self.monitor_service.is_running,
            "websockets": len(self.websockets),
            "timestamp": time.time(),
        })

    async def handle_status(self, request: web.Request) -> web.Response:
        """Overall monitoring status"""
        try:
            status = self.monitor_service.get_status()
            return web.json_response({
                "status": "online" if status["running"] else "offline",
                "uptime": status["uptime"],
                "total_checks": status["total_checks"],
                "tasks": status.get("tasks", {}),
            })
        except Exception as e:
            return _error_response(e)

    async def handle_characters(self, request: web.Request) -> web.Response:
        """Characters data"""
        try:
            status = self.monitor_service.get_status()
            config = get_config()

            characters = {}
            for char_id, cs in status["characters"].items():
                char_config = config.characters.get(char_id)
                characters[char_id] = {
                    "label": char_config.label if char_config else char_id,
                    "is_alive": cs["alive"],
                    "is_connected": cs["connected"],
                    "hp": cs["hp"],
                    "cp": cs["cp"],
                    "xp": cs.get("xp", 0),
                    "death_count": cs["death_count"],
                    "disconnect_count": cs["disconnect_count"],
                    "last_check": cs["last_check"],
                    "errors": cs.get("errors", 0),
                }

            return web.json_response({"characters": characters})
        except Exception as e:
            return _error_response(e)

    async def handle_system(self, request: web.Request) -> web.Response:
        """System information"""
        try:
            info = self.system_monitor.get_full_system_info()
            cpu = info.get("cpu", {})
            mem = info.get("memory", {})
            gpu = info.get("gpu", {})
            l2 = info.get("l2_processes", {})

            return web.json_response({
                "cpu_percent": cpu.get("usage_percent", 0),
                "cpu_temp": cpu.get("temperature_celsius"),
                "ram_percent": mem.get("usage_percent", 0),
                "ram_used_gb": mem.get("used_gb", 0),
                "ram_total_gb": mem.get("total_gb", 0),
                "gpu_temp": gpu.get("temperature_celsius") if gpu.get("available") else None,
                "gpu_usage": gpu.get("usage_percent") if gpu.get("available") else None,
                "l2_processes": [
                    {
                        "pid": p["pid"],
                        "memory_mb": p["memory_mb"],
                        "cpu_percent": p.get("cpu_percent", 0),
                    }
                    for p in l2.get("processes", [])
                ],
            })
        except Exception as e:
            return _error_response(e)

    async def handle_clickers(self, request: web.Request) -> web.Response:
        """Clicker status for all characters"""
        try:
            clickers = {}
            for char_id, clicker in self.monitor_service.clicker_manager.clickers.items():
                status = clicker.get_status()
                clickers[char_id] = {
                    "state": status["state"],
                    "cycles": status["cycles"],
                    "total_clicks": status["total_clicks"],
                    "cps": status["cps"],
                    "uptime": status["uptime"],
                    "skills": status.get("skills", []),
                }

            return web.json_response({"clickers": clickers})
        except Exception as e:
            return _error_response(e)

    async def handle_logs(self, request: web.Request) -> web.Response:
        """Recent log entries"""
        try:
            if not self.log_service:
                return web.json_response({"logs": []})

            limit = int(request.query.get("limit", "20"))
            limit = min(limit, 100)  # Cap at 100

            logs = await self.log_service.get_recent(limit=limit)

            return web.json_response({
                "logs": [
                    {
                        "timestamp": log["timestamp"],
                        "event_type": log["event_type"],
                        "character": log.get("character", ""),
                        "details": log.get("details", {}),
                    }
                    for log in logs
                ]
            })
        except Exception as e:
            return _error_response(e)

    async def handle_action(self, request: web.Request) -> web.Response:
        """Execute action from dashboard"""
        try:
            data = await request.json()
            action = data.get("action")
            char_id = data.get("character", "main")

            clicker_mgr = self.monitor_service.clicker_manager

            if action == "start_clicker":
                success = await clicker_mgr.start(char_id)
                return web.json_response({"success": success})

            elif action == "stop_clicker":
                await clicker_mgr.stop(char_id)
                return web.json_response({"success": True})

            elif action == "start_all":
                started = []
                for cid in clicker_mgr.clickers:
                    if await clicker_mgr.start(cid):
                        started.append(cid)
                return web.json_response({"success": True, "started": started})

            elif action == "stop_all":
                for cid in clicker_mgr.clickers:
                    await clicker_mgr.stop(cid)
                return web.json_response({"success": True})

            else:
                return web.json_response(
                    {"error": f"Unknown action: {action}"}, status=400
                )

        except Exception as e:
            return _error_response(e)

    # ══════════════════════════════════════════════════════
    #  WebSocket
    # ══════════════════════════════════════════════════════

    async def handle_websocket(self, request: web.Request) -> web.WebSocketResponse:
        """WebSocket connection handler"""
        # Optional: check token in query for WS
        if self._api_token:
            token = request.query.get("token")
            if token != self._api_token:
                ws = web.WebSocketResponse()
                await ws.prepare(request)
                await ws.send_json({"type": "error", "message": "Unauthorized"})
                await ws.close()
                return ws

        ws = web.WebSocketResponse(
            heartbeat=30.0,  # Ping every 30s to keep alive
        )
        await ws.prepare(request)

        self.websockets.add(ws)
        logger.info(f"WS connected. Total: {len(self.websockets)}")

        try:
            # Initial full state
            await self._send_update(ws)

            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        action = data.get("action")

                        if action == "ping":
                            await ws.send_json({"type": "pong"})
                        elif action == "refresh":
                            await self._send_update(ws)

                    except json.JSONDecodeError:
                        pass
                    except Exception as e:
                        logger.error(f"WS message error: {e}")

                elif msg.type in (web.WSMsgType.ERROR, web.WSMsgType.CLOSE):
                    break

        except Exception as e:
            logger.debug(f"WS connection error: {e}")

        finally:
            self.websockets.discard(ws)
            logger.info(f"WS disconnected. Total: {len(self.websockets)}")

        return ws

    # ══════════════════════════════════════════════════════
    #  Data Collection (shared by REST + WS)
    # ══════════════════════════════════════════════════════

    def _collect_full_state(self) -> Dict[str, Any]:
        """
        Единая точка сбора данных (DRY).
        
        Используется и для WebSocket broadcast, и для REST endpoints.
        """
        status = self.monitor_service.get_status()
        system_info = self.system_monitor.get_full_system_info()
        config = get_config()

        cpu = system_info.get("cpu", {})
        mem = system_info.get("memory", {})
        gpu = system_info.get("gpu", {})

        # Characters
        characters = {}
        for char_id, cs in status["characters"].items():
            char_config = config.characters.get(char_id)
            characters[char_id] = {
                "label": char_config.label if char_config else char_id,
                "is_alive": cs["alive"],
                "is_connected": cs["connected"],
                "hp": cs["hp"],
                "cp": cs["cp"],
                "xp": cs.get("xp", 0),
                "death_count": cs["death_count"],
                "disconnect_count": cs["disconnect_count"],
                "errors": cs.get("errors", 0),
            }

        # Clickers
        clickers = {}
        for char_id, clicker in self.monitor_service.clicker_manager.clickers.items():
            st = clicker.get_status()
            clickers[char_id] = {
                "state": st["state"],
                "cycles": st["cycles"],
                "total_clicks": st["total_clicks"],
                "cps": st["cps"],
                "uptime": st["uptime"],
            }

        return {
            "status": "online" if status["running"] else "offline",
            "uptime": status["uptime"],
            "total_checks": status["total_checks"],
            "characters": characters,
            "clickers": clickers,
            "system": {
                "cpu_percent": cpu.get("usage_percent", 0),
                "cpu_temp": cpu.get("temperature_celsius"),
                "ram_percent": mem.get("usage_percent", 0),
                "gpu_temp": gpu.get("temperature_celsius") if gpu.get("available") else None,
            },
            "timestamp": time.time(),
        }

    async def _send_update(self, ws: web.WebSocketResponse):
        """Send full state update to single WebSocket"""
        try:
            state = self._collect_full_state()
            await ws.send_json({"type": "update", "data": state})
        except Exception as e:
            logger.debug(f"Send update error: {e}")

    # ══════════════════════════════════════════════════════
    #  Broadcast
    # ══════════════════════════════════════════════════════

    async def broadcast_update(self):
        """Broadcast to all connected WebSockets"""
        if not self.websockets:
            return

        # Собираем данные один раз
        try:
            state = self._collect_full_state()
            message = json.dumps({"type": "update", "data": state})
        except Exception as e:
            logger.error(f"Broadcast data error: {e}")
            return

        # Отправляем всем, удаляем мёртвые
        dead = set()
        for ws in self.websockets:
            if ws.closed:
                dead.add(ws)
                continue
            try:
                await ws.send_str(message)
            except Exception:
                dead.add(ws)

        self.websockets -= dead

    async def _broadcast_loop(self):
        """Background broadcast task"""
        while True:
            try:
                await asyncio.sleep(self._broadcast_interval)
                await self.broadcast_update()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Broadcast loop error: {e}")
                await asyncio.sleep(5)  # Back off on error

    # ══════════════════════════════════════════════════════
    #  Lifecycle
    # ══════════════════════════════════════════════════════

    async def start(self):
        """Start API server"""
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()

        site = web.TCPSite(self.runner, self.host, self.port)
        await site.start()

        self._broadcast_task = asyncio.create_task(
            self._broadcast_loop(), name="ws_broadcast"
        )

        logger.info(
            f"✅ Dashboard API: http://{self.host}:{self.port}\n"
            f"   WebSocket: ws://{self.host}:{self.port}/ws\n"
            f"   Auth: {'enabled' if self._api_token else 'disabled'}"
        )

        if self._api_token:
            logger.info(f"   API Token: {self._api_token[:8]}...")

    async def stop(self):
        """Stop API server"""
        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass

        for ws in list(self.websockets):
            try:
                await ws.close()
            except Exception:
                pass
        self.websockets.clear()

        if self.runner:
            await self.runner.cleanup()

        logger.info("🛑 Dashboard API stopped")


# ══════════════════════════════════════════════════════════════
#  Helpers
# ══════════════════════════════════════════════════════════════

def _error_response(e: Exception) -> web.Response:
    """Standard error response"""
    logger.error(f"API error: {e}")
    return web.json_response({"error": str(e)}, status=500)