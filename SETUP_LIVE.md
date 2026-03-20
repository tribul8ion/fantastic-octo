# Настройка Live Dashboard

## Быстрый старт

### 1. Установка зависимостей
```bash
pip install aiohttp-cors
```

### 2. Запуск бота
API сервер запускается автоматически:
```bash
python l2monitor/bot/app.py
```

Вы увидите:
```
✅ Dashboard API server started on http://0.0.0.0:8765
   WebSocket: ws://0.0.0.0:8765/ws
```

### 3. Настройка dashboard.js

Откройте `l2monitor/webapp/dashboard.js` и измените:

```javascript
// Для локального тестирования
const API_BASE = 'http://localhost:8765';

// Для доступа с телефона в локальной сети
const API_BASE = 'http://192.168.1.100:8765';  // IP вашего ПК

// Для публичного доступа (через ngrok)
const API_BASE = 'https://abc123.ngrok.io';
```

### 4. Хостинг dashboard.html

#### Вариант A: Локальный сервер (для разработки)
```bash
cd l2monitor/webapp
python -m http.server 8000
```
Откройте: http://localhost:8000/dashboard.html

#### Вариант B: GitHub Pages (бесплатно)
1. Создай репозиторий на GitHub
2. Загрузи `dashboard.html` и `dashboard.js`
3. Включи GitHub Pages в настройках
4. Получишь URL: `https://username.github.io/repo/dashboard.html`

#### Вариант C: Vercel (бесплатно)
```bash
npm install -g vercel
cd l2monitor/webapp
vercel
```

### 5. Открытие в Telegram

В боте добавь команду:
```python
@router.message(Command("dashboard"))
async def cmd_dashboard(message: Message):
    url = "https://your-dashboard-url.com/dashboard.html"
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📊 Open Dashboard", web_app=WebAppInfo(url=url))]
    ])
    
    await message.answer("Открыть дашборд:", reply_markup=keyboard)
```

## Доступ из локальной сети

### Узнать IP адрес ПК

**Windows:**
```bash
ipconfig
# Найди IPv4 Address (например: 192.168.1.100)
```

**Linux/Mac:**
```bash
ifconfig
# или
ip addr show
```

### Открыть порт в firewall

**Windows:**
```bash
netsh advfirewall firewall add rule name="L2Monitor API" dir=in action=allow protocol=TCP localport=8765
```

**Linux:**
```bash
sudo ufw allow 8765/tcp
```

### Проверка доступности

С телефона в той же сети:
```
http://192.168.1.100:8765/api/status
```

Должен вернуть JSON с данными.

## Публичный доступ (через ngrok)

### 1. Установка ngrok
Скачай с https://ngrok.com/download

### 2. Запуск туннеля
```bash
ngrok http 8765
```

Получишь URL:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8765
```

### 3. Обновление dashboard.js
```javascript
const API_BASE = 'https://abc123.ngrok.io';
```

⚠️ **Важно:** Бесплатный ngrok меняет URL при каждом запуске. Для постоянного URL нужен платный план.

## Альтернатива: Cloudflare Tunnel

Бесплатная альтернатива ngrok с постоянным URL.

### 1. Установка
```bash
# Windows
winget install --id Cloudflare.cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Запуск туннеля
```bash
cloudflared tunnel --url http://localhost:8765
```

Получишь постоянный URL.

## Troubleshooting

### WebSocket не подключается
1. Проверь что бот запущен
2. Проверь firewall
3. Проверь что порт 8765 не занят:
   ```bash
   netstat -ano | findstr :8765
   ```

### CORS ошибки
Убедись что `aiohttp-cors` установлен:
```bash
pip show aiohttp-cors
```

### Данные не обновляются
1. Открой консоль браузера (F12)
2. Проверь ошибки WebSocket
3. Проверь что API_BASE правильный

### Медленное обновление
WebSocket обновляет данные каждые 3 секунды. Для изменения:
```python
# В api_server.py
await asyncio.sleep(1)  # Обновление каждую секунду
```

## Production Setup

Для продакшена рекомендуется:

1. **Nginx reverse proxy:**
```nginx
server {
    listen 80;
    server_name dashboard.example.com;
    
    location / {
        proxy_pass http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

2. **SSL сертификат (Let's Encrypt):**
```bash
certbot --nginx -d dashboard.example.com
```

3. **Systemd service:**
```ini
[Unit]
Description=L2 Monitor Bot
After=network.target

[Service]
Type=simple
User=l2monitor
WorkingDirectory=/home/l2monitor/bot
ExecStart=/usr/bin/python3 l2monitor/bot/app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## Security

⚠️ **API не имеет аутентификации!**

Для безопасности:
1. Используй только в локальной сети
2. Или добавь VPN (WireGuard/OpenVPN)
3. Или добавь token authentication в API

Пример с токеном:
```python
# В api_server.py
async def auth_middleware(request, handler):
    token = request.headers.get('Authorization')
    if token != 'your-secret-token':
        return web.json_response({'error': 'Unauthorized'}, status=401)
    return await handler(request)

self.app.middlewares.append(auth_middleware)
```

## Monitoring

Проверка работы API:
```bash
# Status
curl http://localhost:8765/api/status

# Characters
curl http://localhost:8765/api/characters

# WebSocket (с wscat)
npm install -g wscat
wscat -c ws://localhost:8765/ws
```

## Performance Tips

1. **Уменьшить частоту обновлений:**
   ```python
   await asyncio.sleep(5)  # Вместо 3 секунд
   ```

2. **Ограничить количество подключений:**
   ```python
   if len(self.websockets) >= 10:
       await ws.close()
       return
   ```

3. **Кэширование данных:**
   ```python
   self._cache = None
   self._cache_time = 0
   
   if time.time() - self._cache_time < 1:
       return self._cache
   ```

## Next Steps

- [ ] Добавить аутентификацию
- [ ] Добавить HTTPS
- [ ] Добавить rate limiting
- [ ] Добавить метрики (Prometheus)
- [ ] Добавить логирование запросов
