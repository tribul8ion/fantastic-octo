@echo off
REM Quick deploy script for GitHub (Windows)

echo 🚀 L2 Monitor Dashboard - Quick Deploy
echo.

REM Check if git is initialized
if not exist .git (
    echo 📦 Initializing git...
    git init
)

REM Add files
echo 📝 Adding files...
git add dashboard.html
git add dashboard.js
git add vercel.json
git add .vercelignore
git add README_VERCEL.md
git add GITHUB_DEPLOY.md

REM Commit
echo 💾 Committing...
set /p commit_msg="Commit message (default: Update dashboard): "
if "%commit_msg%"=="" set commit_msg=Update dashboard
git commit -m "%commit_msg%"

REM Check if remote exists
git remote | findstr origin >nul
if errorlevel 1 (
    echo 🔗 Adding remote...
    git remote add origin https://github.com/tribul8ion/fantastic-octo123.git
)

REM Push
echo ⬆️ Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ✅ Done! Check:
echo    GitHub: https://github.com/tribul8ion/fantastic-octo123
echo    Vercel: https://vercel.com/tribul8ion/fantastic-octo123
echo    Live: https://fantastic-octo123.vercel.app
pause
