# Деплой Web App на Vercel

## Быстрый старт

### Вариант 1: Через Vercel CLI (самый простой)

1. Установите Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Перейдите в папку webapp:
   ```bash
   cd l2monitor/webapp
   ```

3. Запустите деплой:
   ```bash
   vercel
   ```

4. Следуйте инструкциям:
   - Login to Vercel (если первый раз)
   - Set up and deploy? Yes
   - Which scope? (выберите ваш аккаунт)
   - Link to existing project? No
   - Project name? (например: l2-rotation-editor)
   - In which directory is your code located? ./
   - Want to override settings? No

5. После деплоя получите URL:
   ```
   ✅ Production: https://l2-rotation-editor.vercel.app
   ```

### Вариант 2: Через Vercel Dashboard

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "New Project"
3. Выберите "Import Git Repository" или "Deploy from CLI"
4. Если через Git:
   - Подключите GitHub
   - Выберите репозиторий
   - Root Directory: `l2monitor/webapp`
   - Framework Preset: Other
   - Нажмите "Deploy"

### Вариант 3: Drag & Drop

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "New Project"
3. Выберите "Deploy from CLI" → "Continue with Vercel CLI"
4. Или просто перетащите папку `webapp` в окно браузера

## Настройка бота

После деплоя:

1. Скопируйте URL (например: `https://l2-rotation-editor.vercel.app`)

2. Откройте `l2monitor/bot/handlers/rotation_editor.py`

3. Замените URL:
   ```python
   webapp_url = "https://l2-rotation-editor.vercel.app"
   ```

4. Перезапустите бота:
   ```bash
   python l2monitor/bot/app.py
   ```

## Проверка

1. Откройте Telegram
2. Отправьте `/rotation`
3. Нажмите "🎮 Редактор ротации"
4. Web App должен открыться

## Обновление

Для обновления Web App:

```bash
cd l2monitor/webapp
vercel --prod
```

Или просто сделайте git push, если используете GitHub.

## Troubleshooting

### Ошибка "Command not found: vercel"

Установите Node.js и npm, затем:
```bash
npm install -g vercel
```

### Web App не открывается

- Проверьте что URL правильный в `rotation_editor.py`
- Проверьте что деплой успешен на vercel.com
- Проверьте консоль браузера (F12)

### CORS ошибки

Vercel автоматически настраивает CORS для Telegram Web Apps.

## Альтернативы

Если Vercel не подходит, можно использовать:
- GitHub Pages
- Netlify
- Cloudflare Pages
- Firebase Hosting

Все они бесплатны и поддерживают HTTPS.
