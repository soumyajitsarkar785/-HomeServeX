@echo off
echo ========================================================
echo   HomeServeX - Uploading Entire Project to GitHub
echo ========================================================

echo 1. Initializing Git Repository...
git init

echo 2. Setting Default Branch to main...
git branch -M main

echo 3. Setting Remote Origin to GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/soumyajitsarkar785/-HomeServeX.git

echo 4. Staging all project files (ignoring node_modules, dev.db, .env)...
git add .

echo 5. Creating initial commit...
git commit -m "Complete HomeServeX Platform: API, Customer, Partner, Admin Portals & Core Modules"

echo 6. Pushing to GitHub main branch...
git push -u origin main

echo ========================================================
echo   Upload Complete! Check: https://github.com/soumyajitsarkar785/-HomeServeX
echo ========================================================
pause
