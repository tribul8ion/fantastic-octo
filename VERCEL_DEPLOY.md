# Деплой Dashboard на Vercel

## Быстрый деплой (через CLI)

### 1. Установка Vercel CLI
```bash
npm install -g vercel
```

### 2. Настройка API endpoint

Перед деплоем нужно указать IP твоего ПК в `dashboard.js`:

```javascript
// Найди эту строку и замени на IP твоего ПК
const API_BASE = 'http://192.168.1.100:8765';  // Твой локальный IP

// Или используй ngrok для публичного доступа
const API_BASE = 'https://abc123.ngrok.io';
```

**Как узнать IP:**
```bash
# Windows
ipconfig
# Найди IPv4 Address (например: 192.168.1.100)

# Linux/Mac
ifconfig
```

### 3. Деплой
```bash
cd l2monitor/webapp
vercel
```

Следуй инструкциям:
- Login to Vercel (если первый раз)
- Set up and deploy? **Y**
- Which scope? Выбери свой аккаунт
- Link to existing project? **N**
- Project name? **l2monitor-dashboard** (или любое имя)
- In which directory? **.** (текущая)
- Override settings? **N**

Получишь URL:
```
✅ Deployed to production: https://l2monitor-dashboard.vercel.app
```

### 4. Открыть в Telegram

Добавь команду в бот:

```python
# В l2monitor/bot/handlers/webapp.py
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

router = Router(name='webapp')

@router.message(Command("dashboard"))
async def cmd_dashboard(message: Message):
    """Open dashboard web app"""
    url = "https://l2monitor-dashboard.vercel.app"
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📊 Open Dashboard",
            web_app=WebAppInfo(url=url)
        )]
    ])
    
    await message.answer(
        "🎮 <b>L2 Monitor Dashboard</b>\n\n"
        "Открой дашборд для мониторинга в реальном времени:",
        reply_markup=keyboard
    )
```

Зарегистрируй роутер в `bot/app.py`:
```python
from l2monitor.bot.handlers import webapp
self.dp.include_router(webapp.router)
```

## Деплой через GitHub (автоматический)

### 1. Создай репозиторий на GitHub
```bash
cd l2monitor/webapp
git init
git add dashboard.html dashboard.js vercel.json
git commit -m "Initial dashboard"
git remote add origin https://github.com/username/l2monitor-dashboard.git
git push -u origin main
```

### 2. Подключи к Vercel
1. Зайди на https://vercel.com
2. New Project
3. Import Git Repository
4. Выбери свой репозиторий
5. Deploy

Теперь при каждом push в GitHub будет автоматический деплой!

## Настройка для разных окружений

Создай файл `config.js`:

```javascript
// config.js
const CONFIG = {
    // Для локальной разработки
    development: {
        API_BASE: 'http://localhost:8765'
    },
    
    // Для локальной сети
    local: {
        API_BASE: 'http://192.168.1.100:8765'
    },
    
    // Для публичного доступа (ngrok)
    production: {
        API_BASE: 'https://abc123.ngrok.io'
    }
};

// Автоопределение окружения
const ENV = window.location.hostname === 'localhost' ? 'development' : 'production';
const API_BASE = CONFIG[ENV].API_BASE;
const WS_URL = API_BASE.replace('http', 'ws') + '/ws';
```

Подключи в `dashboard.html`:
```html
<script src="config.js"></script>
<script src="dashboard.js"></script>
```

## Обновление деплоя

### Через CLI
```bash
cd l2monitor/webapp
vercel --prod
```

### Через GitHub
```bash
git add .
git commit -m "Update dashboard"
git push
```

Vercel автоматически задеплоит изменения.

## Использование с ngrok (для API)

Если твой ПК не имеет статического IP, используй ngrok:

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

### 4. Редеплой
```bash
vercel --prod
```

⚠️ **Важно:** Бесплатный ngrok меняет URL при каждом запуске. Для постоянного URL нужен платный план ($8/мес).

## Альтернатива: Cloudflare Tunnel (бесплатно)

### 1. Установка
```bash
# Windows
winget install --id Cloudflare.cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Создание туннеля
```bash
cloudflared tunnel login
cloudflared tunnel create l2monitor
cloudflared tunnel route dns l2monitor api.yourdomain.com
```

### 3. Запуск туннеля
```bash
cloudflared tunnel run l2monitor
```

Получишь постоянный URL: `https://api.yourdomain.com`

### 4. Обновление dashboard.js
```javascript
const API_BASE = 'https://api.yourdomain.com';
```

## Проверка деплоя

### 1. Открой URL в браузере
```
https://l2monitor-dashboard.vercel.app
```

### 2. Проверь консоль (F12)
Должно быть:
```
✅ WebSocket connected
```

Или:
```
🔴 Соединение потеряно
```
(Если API сервер не запущен)

### 3. Проверь что API доступен
```bash
curl http://192.168.1.100:8765/api/status
```

## Troubleshooting

### WebSocket не подключается
1. Проверь что бот запущен
2. Проверь firewall:
   ```bash
   netsh advfirewall firewall add rule name="L2Monitor" dir=in action=allow protocol=TCP localport=8765
   ```
3. Проверь что API_BASE правильный в dashboard.js

### CORS ошибки
Убедись что в `api_server.py` включен CORS:
```python
cors = aiohttp_cors.setup(self.app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
        allow_methods="*"
    )
})
```

### Mixed Content (HTTP/HTTPS)
Vercel использует HTTPS, а твой API - HTTP. Браузер может блокировать.

**Решение 1:** Используй ngrok/cloudflare (HTTPS)
**Решение 2:** Открой дашборд через HTTP (не через Vercel)

### Vercel деплой не работает
```bash
# Проверь логи
vercel logs

# Переделай деплой
vercel --prod --force
```

## Custom Domain (опционально)

### 1. Купи домен (например на Namecheap)

### 2. Добавь в Vercel
1. Project Settings
2. Domains
3. Add Domain
4. Следуй инструкциям

### 3. Обновление DNS
Добавь CNAME запись:
```
dashboard.yourdomain.com -> cname.vercel-dns.com
```

Через 5-10 минут будет доступен:
```
https://dashboard.yourdomain.com
```

## Environment Variables (для разных API)

### 1. Создай `.env.local`
```bash
VITE_API_BASE=http://192.168.1.100:8765
```

### 2. Обновление dashboard.js
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8765';
```

### 3. Добавь в Vercel
1. Project Settings
2. Environment Variables
3. Add: `VITE_API_BASE` = `https://your-ngrok-url.io`

## Мониторинг деплоя

### Vercel Dashboard
https://vercel.com/dashboard

Показывает:
- Deployments (история)
- Analytics (посещения)
- Logs (ошибки)
- Performance (скорость)

### Webhook для уведомлений
Настрой webhook в Vercel для уведомлений в Telegram при деплое:

1. Project Settings → Git → Deploy Hooks
2. Create Hook
3. URL: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<USER_ID>&text=Dashboard deployed!`

## Стоимость

Vercel бесплатный план:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Analytics

Для большинства случаев достаточно бесплатного плана.

## Следующие шаги

После деплоя:
1. Проверь что дашборд открывается
2. Проверь что WebSocket подключается
3. Проверь что данные обновляются
4. Добавь команду `/dashboard` в бот
5. Протестируй на телефоне

## Полезные команды

```bash
# Деплой в production
vercel --prod

# Деплой в preview (для тестирования)
vercel

# Просмотр логов
vercel logs

# Список деплоев
vercel ls

# Удалить деплой
vercel rm <deployment-url>

# Информация о проекте
vercel inspect
```

## Пример полного workflow

```bash
# 1. Настройка API endpoint
nano dashboard.js  # Измени API_BASE

# 2. Деплой
cd l2monitor/webapp
vercel --prod

# 3. Получи URL
# https://l2monitor-dashboard.vercel.app

# 4. Добавь в бот
# Создай команду /dashboard с WebAppInfo

# 5. Запусти бота
python l2monitor/bot/app.py

# 6. Запусти ngrok (если нужен публичный API)
ngrok http 8765

# 7. Обновление dashboard.js с ngrok URL
nano dashboard.js  # API_BASE = ngrok URL

# 8. Редеплой
vercel --prod

# 9. Готово!
```

---

**Время деплоя:** ~2 минуты  
**Стоимость:** Бесплатно  
**Обновления:** Автоматические (через GitHub) или ручные (через CLI)
