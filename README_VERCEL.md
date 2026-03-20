# 🚀 Быстрый деплой на Vercel

## За 5 минут

### 1. Установи Vercel CLI
```bash
npm install -g vercel
```

### 2. Настрой API endpoint

Открой `dashboard.js` и найди эту строку:
```javascript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8765' 
    : 'http://YOUR_SERVER_IP:8765';
```

Замени `YOUR_SERVER_IP` на IP твоего ПК:
```javascript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8765' 
    : 'http://192.168.1.100:8765';  // <-- Твой IP
```

**Как узнать IP:**
```bash
ipconfig  # Windows
ifconfig  # Linux/Mac
```

### 3. Деплой
```bash
cd l2monitor/webapp
vercel
```

Следуй инструкциям:
- Login (если первый раз)
- Set up and deploy? → **Y**
- Project name? → **l2monitor-dashboard**
- Override settings? → **N**

Получишь URL:
```
✅ https://l2monitor-dashboard.vercel.app
```

### 4. Обновление URL в боте

Открой `l2monitor/bot/handlers/webapp.py` и замени URL:
```python
url = "https://l2monitor-dashboard.vercel.app"  # <-- Твой URL
```

### 5. Перезапусти бота
```bash
python l2monitor/bot/app.py
```

### 6. Открой в Telegram
```
/dashboard
```

Нажми кнопку "📊 Open Dashboard" - готово! 🎉

## Публичный доступ к API (через ngrok)

Если хочешь открыть дашборд друзьям или с другой сети:

### 1. Установи ngrok
Скачай с https://ngrok.com/download

### 2. Запусти туннель
```bash
ngrok http 8765
```

Получишь:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8765
```

### 3. Обновление dashboard.js
```javascript
const API_BASE = 'https://abc123.ngrok.io';  // <-- ngrok URL
```

### 4. Редеплой
```bash
vercel --prod
```

Теперь дашборд доступен из любой точки мира! 🌍

## Обновление дашборда

После изменений:
```bash
cd l2monitor/webapp
vercel --prod
```

## Автоматический деплой (через GitHub)

### 1. Создай репозиторий
```bash
cd l2monitor/webapp
git init
git add .
git commit -m "Dashboard"
git remote add origin https://github.com/username/l2monitor-dashboard.git
git push -u origin main
```

### 2. Подключи к Vercel
1. https://vercel.com → New Project
2. Import Git Repository
3. Выбери репозиторий
4. Deploy

Теперь при каждом `git push` будет автоматический деплой!

## Проблемы?

### WebSocket не подключается
1. Проверь что бот запущен
2. Проверь firewall:
   ```bash
   netsh advfirewall firewall add rule name="L2Monitor" dir=in action=allow protocol=TCP localport=8765
   ```

### Mixed Content (HTTPS/HTTP)
Vercel использует HTTPS, а твой API - HTTP. Используй ngrok для HTTPS API.

### Vercel деплой не работает
```bash
vercel logs  # Проверь ошибки
vercel --prod --force  # Переделай деплой
```

## Полезные команды

```bash
vercel          # Деплой в preview
vercel --prod   # Деплой в production
vercel logs     # Логи
vercel ls       # Список деплоев
vercel rm <url> # Удалить деплой
```

## Стоимость

**Бесплатно!** ✅
- Unlimited deployments
- 100 GB bandwidth/month
- Automatic HTTPS
- Custom domains

---

**Время:** 5 минут  
**Сложность:** Легко  
**Стоимость:** $0
