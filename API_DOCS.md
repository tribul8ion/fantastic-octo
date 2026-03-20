# Dashboard API Documentation

## Overview

API сервер для веб-дашборда с поддержкой REST API и WebSocket для live-обновлений.

## Configuration

Сервер запускается автоматически при старте бота на порту `8765`.

Для доступа извне настрой переадресацию портов или используй ngrok:
```bash
ngrok http 8765
```

## REST API Endpoints

### GET /api/status
Получить общий статус системы.

**Response:**
```json
{
  "status": "online",
  "uptime": 7234,
  "total_checks": 2411
}
```

### GET /api/characters
Получить данные персонажей.

**Response:**
```json
{
  "characters": {
    "main": {
      "label": "Main",
      "is_alive": true,
      "is_connected": true,
      "hp": 87,
      "cp": 92,
      "death_count": 2,
      "disconnect_count": 0,
      "last_check": 1710936789.123
    },
    "buffer": { ... }
  }
}
```

### GET /api/system
Получить системную информацию.

**Response:**
```json
{
  "cpu": 45,
  "ram": 62,
  "gpu_temp": 72,
  "cpu_temp": 68,
  "l2_processes": [
    {
      "pid": 12345,
      "memory_mb": 1204,
      "cpu_percent": 15.3
    }
  ]
}
```

### GET /api/clickers
Получить статус кликеров.

**Response:**
```json
{
  "clickers": {
    "main": {
      "state": "running",
      "cycles": 1247,
      "total_clicks": 7482,
      "cps": 2.3,
      "uptime": 7200,
      "skills": [
        {
          "key": "F1",
          "name": "Skill 1",
          "enabled": true,
          "ready": true,
          "use_count": 150
        }
      ]
    }
  }
}
```

### GET /api/logs
Получить последние события.

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-03-20 15:30:45",
      "event_type": "death",
      "character": "main",
      "details": { "count": 2 }
    }
  ]
}
```

### POST /api/action
Выполнить действие.

**Request:**
```json
{
  "action": "start_clicker",
  "character": "main"
}
```

**Actions:**
- `start_clicker` - запустить кликер (параметр: `character`)
- `stop_clicker` - остановить кликер (параметр: `character`)
- `start_all` - запустить все кликеры
- `stop_all` - остановить все кликеры

**Response:**
```json
{
  "success": true
}
```

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8765/ws');
```

### Messages from Client

**Ping:**
```json
{ "action": "ping" }
```

**Refresh:**
```json
{ "action": "refresh" }
```

### Messages from Server

**Pong:**
```json
{ "type": "pong" }
```

**Update (каждые 3 секунды):**
```json
{
  "type": "update",
  "data": {
    "status": "online",
    "uptime": 7234,
    "characters": { ... },
    "system": { ... },
    "clickers": { ... },
    "timestamp": 1710936789.123
  }
}
```

## Usage Example

### JavaScript (WebSocket)
```javascript
const ws = new WebSocket('ws://localhost:8765/ws');

ws.onopen = () => {
    console.log('Connected');
    ws.send(JSON.stringify({ action: 'refresh' }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'update') {
        console.log('Data:', message.data);
        // Update UI
    }
};

// Ping every 30 seconds
setInterval(() => {
    ws.send(JSON.stringify({ action: 'ping' }));
}, 30000);
```

### JavaScript (REST API)
```javascript
// Get status
const response = await fetch('http://localhost:8765/api/status');
const data = await response.json();
console.log(data);

// Start clicker
await fetch('http://localhost:8765/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        action: 'start_clicker',
        character: 'main'
    })
});
```

## CORS

CORS включен для всех origins (`*`). Для продакшена рекомендуется ограничить список разрешенных доменов.

## Security

⚠️ **Важно:** API сервер не имеет аутентификации. Используй только в локальной сети или за VPN/firewall.

Для публичного доступа добавь:
- Token-based authentication
- Rate limiting
- HTTPS (через nginx/caddy)

## Troubleshooting

### Порт занят
Измени порт в `bot/app.py`:
```python
self.api_server = DashboardAPIServer(
    ...,
    port=9000  # Другой порт
)
```

### WebSocket не подключается
Проверь firewall:
```bash
# Windows
netsh advfirewall firewall add rule name="L2Monitor API" dir=in action=allow protocol=TCP localport=8765
```

### CORS ошибки
Убедись что `aiohttp-cors` установлен:
```bash
pip install aiohttp-cors
```

## Performance

- WebSocket broadcast: каждые 3 секунды
- Максимум подключений: не ограничено (зависит от системы)
- Overhead: ~1-2% CPU при 10 подключениях

## Development

Для разработки используй локальный сервер:
```bash
# В dashboard.js измени:
const API_BASE = 'http://localhost:8765';
```

Для продакшена используй IP сервера:
```bash
const API_BASE = 'http://192.168.1.100:8765';
```
