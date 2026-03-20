#!/bin/bash
# Quick deploy script for GitHub

echo "🚀 L2 Monitor Dashboard - Quick Deploy"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git..."
    git init
fi

# Add files
echo "📝 Adding files..."
git add dashboard.html
git add dashboard.js
git add vercel.json
git add .vercelignore
git add README_VERCEL.md
git add GITHUB_DEPLOY.md

# Commit
echo "💾 Committing..."
read -p "Commit message (default: Update dashboard): " commit_msg
commit_msg=${commit_msg:-"Update dashboard"}
git commit -m "$commit_msg"

# Check if remote exists
if ! git remote | grep -q origin; then
    echo "🔗 Adding remote..."
    git remote add origin https://github.com/tribul8ion/fantastic-octo123.git
fi

# Push
echo "⬆️ Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Check:"
echo "   GitHub: https://github.com/tribul8ion/fantastic-octo123"
echo "   Vercel: https://vercel.com/tribul8ion/fantastic-octo123"
echo "   Live: https://fantastic-octo123.vercel.app"
