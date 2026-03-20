# 🚀 Деплой через GitHub → Vercel

## Быстрая заливка на GitHub

### 1. Подготовка файлов

Перед заливкой обновим API endpoint в `dashboard.js`:

```javascript
// Найди эту строку (около строки 10)
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8765' 
    : 'http://YOUR_SERVER_IP:8765';

// Замени YOUR_SERVER_IP на твой IP
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8765' 
    : 'http://192.168.1.100:8765';  // <-- Твой IP (узнай через ipconfig)
```

### 2. Инициализация Git (если ещё не сделано)

```bash
cd l2monitor/webapp
git init
```

### 3. Добавление файлов

```bash
# Добавляем только нужные файлы для веб-приложения
git add dashboard.html
git add dashboard.js
git add vercel.json
git add .vercelignore
git add README_VERCEL.md
```

### 4. Коммит

```bash
git commit -m "Initial dashboard deployment"
```

### 5. Подключение к GitHub

```bash
git remote add origin https://github.com/tribul8ion/fantastic-octo123.git
git branch -M main
git push -u origin main
```

Если попросит авторизацию:
- Username: `tribul8ion`
- Password: используй Personal Access Token (не пароль!)

**Создание токена:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Выбери scopes: `repo` (полный доступ к репозиториям)
4. Скопируй токен и используй вместо пароля

### 6. Проверка

Открой https://github.com/tribul8ion/fantastic-octo123

Должны быть файлы:
- ✅ dashboard.html
- ✅ dashboard.js
- ✅ vercel.json
- ✅ .vercelignore
- ✅ README_VERCEL.md

## Автоматический деплой на Vercel

### 1. Зайди на Vercel

https://vercel.com (войди через GitHub)

### 2. Создай новый проект

1. Нажми **"Add New..."** → **"Project"**
2. Найди репозиторий `fantastic-octo123`
3. Нажми **"Import"**

### 3. Настройка проекта

**Framework Preset:** Other (оставь как есть)

**Root Directory:** `.` (оставь как есть)

**Build Command:** (оставь пустым)

**Output Directory:** (оставь пустым)

**Install Command:** (оставь пустым)

### 4. Deploy

Нажми **"Deploy"**

Через 30-60 секунд получишь URL:
```
✅ https://fantastic-octo123.vercel.app
```

### 5. Обновление URL в боте

Открой `l2monitor/bot/handlers/webapp.py` и замени URL:

```python
# Было:
url = "https://l2monitor-dashboard.vercel.app"

# Стало:
url = "https://fantastic-octo123.vercel.app"
```

### 6. Перезапусти бота

```bash
python l2monitor/bot/app.py
```

### 7. Тест в Telegram

```
/dashboard
```

Нажми кнопку "📊 Open Dashboard" - готово! 🎉

## Автоматические обновления

Теперь при каждом изменении:

```bash
# 1. Внеси изменения в dashboard.js или dashboard.html
nano dashboard.js

# 2. Закоммить
git add .
git commit -m "Update dashboard"

# 3. Запушить
git push

# 4. Vercel автоматически задеплоит!
```

Через 30 секунд изменения будут на https://fantastic-octo123.vercel.app

## Настройка Custom Domain (опционально)

### 1. В Vercel Dashboard

1. Открой проект `fantastic-octo123`
2. Settings → Domains
3. Add Domain: `dashboard.yourdomain.com`

### 2. Настройка DNS

В настройках домена добавь CNAME:
```
CNAME: dashboard → cname.vercel-dns.com
```

### 3. Готово!

Через 5-10 минут будет доступен:
```
https://dashboard.yourdomain.com
```

## Мониторинг деплоев

### Vercel Dashboard

https://vercel.com/tribul8ion/fantastic-octo123

Показывает:
- 📊 Deployments (история)
- 📈 Analytics (посещения)
- 📝 Logs (ошибки)
- ⚡ Performance (скорость)

### GitHub Actions (опционально)

Можно добавить GitHub Action для проверки перед деплоем:

Создай `.github/workflows/deploy.yml`:
```yaml
name: Deploy Check
on: [push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check files
        run: |
          test -f dashboard.html
          test -f dashboard.js
          test -f vercel.json
```

## Webhook уведомления в Telegram

### 1. В Vercel

1. Project Settings → Git → Deploy Hooks
2. Create Hook
3. Name: `Telegram Notification`
4. Branch: `main`

### 2. URL для webhook

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_USER_ID>&text=✅ Dashboard deployed!
```

Замени:
- `<YOUR_BOT_TOKEN>` - токен бота
- `<YOUR_USER_ID>` - твой Telegram ID

### 3. Тест

Сделай коммит:
```bash
git commit --allow-empty -m "Test webhook"
git push
```

Получишь уведомление в Telegram: "✅ Dashboard deployed!"

## Переменные окружения (для разных API)

### 1. В Vercel Dashboard

1. Project Settings → Environment Variables
2. Add Variable:
   - Name: `VITE_API_BASE`
   - Value: `http://192.168.1.100:8765`
   - Environment: Production

### 2. Обновление dashboard.js

```javascript
// Используй переменную окружения
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8765';
```

### 3. Редеплой

Vercel автоматически пересоберёт с новой переменной.

## Rollback (откат к предыдущей версии)

Если что-то сломалось:

### 1. В Vercel Dashboard

1. Deployments
2. Найди рабочую версию
3. Нажми "..." → "Promote to Production"

### 2. Или через Git

```bash
# Откат последнего коммита
git revert HEAD
git push

# Откат к конкретному коммиту
git reset --hard <commit-hash>
git push --force
```

## Troubleshooting

### Push не работает

```bash
# Проверь remote
git remote -v

# Должно быть:
# origin  https://github.com/tribul8ion/fantastic-octo123.git (fetch)
# origin  https://github.com/tribul8ion/fantastic-octo123.git (push)

# Если нет, добавь:
git remote add origin https://github.com/tribul8ion/fantastic-octo123.git
```

### Vercel не видит репозиторий

1. Vercel → Account Settings → Git Integration
2. Configure GitHub App
3. Дай доступ к репозиторию `fantastic-octo123`

### Деплой не запускается автоматически

1. Project Settings → Git
2. Проверь что Production Branch = `main`
3. Проверь что Auto Deploy = Enabled

### Mixed Content (HTTPS/HTTP)

Vercel использует HTTPS, а твой API - HTTP.

**Решение:** Используй ngrok для HTTPS API:
```bash
ngrok http 8765
# https://abc123.ngrok.io

# Обновление dashboard.js
const API_BASE = 'https://abc123.ngrok.io';

# Коммит и пуш
git add dashboard.js
git commit -m "Update API to HTTPS"
git push
```

## Полезные команды

```bash
# Статус репозитория
git status

# История коммитов
git log --oneline

# Просмотр изменений
git diff

# Отмена изменений (до коммита)
git checkout -- dashboard.js

# Удаление файла из Git (но не с диска)
git rm --cached file.txt

# Обновление с GitHub
git pull origin main
```

## Структура репозитория

```
fantastic-octo123/
├── dashboard.html       # UI дашборда
├── dashboard.js         # WebSocket клиент
├── vercel.json         # Конфиг Vercel
├── .vercelignore       # Исключения
└── README_VERCEL.md    # Документация
```

## Следующие шаги

После успешного деплоя:

1. ✅ Проверь что дашборд открывается
2. ✅ Проверь что WebSocket подключается
3. ✅ Протестируй на телефоне
4. ✅ Настрой webhook уведомления
5. ✅ Добавь custom domain (опционально)

## Полезные ссылки

- Репозиторий: https://github.com/tribul8ion/fantastic-octo123
- Vercel Dashboard: https://vercel.com/tribul8ion/fantastic-octo123
- Live URL: https://fantastic-octo123.vercel.app
- GitHub Docs: https://docs.github.com
- Vercel Docs: https://vercel.com/docs

---

**Время:** 5 минут  
**Сложность:** Легко  
**Автоматизация:** ✅ Полная
