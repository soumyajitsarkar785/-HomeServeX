Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   HomeServeX - Uploading Entire Project to GitHub" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n1. Initializing Git Repository..." -ForegroundColor Yellow
git init

Write-Host "2. Setting Default Branch to main..." -ForegroundColor Yellow
git branch -M main

Write-Host "3. Setting Remote Origin to GitHub..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/soumyajitsarkar785/-HomeServeX.git

Write-Host "4. Staging all project files (ignoring node_modules, dev.db, .env)..." -ForegroundColor Yellow
git add .

Write-Host "5. Creating initial commit..." -ForegroundColor Yellow
git commit -m "Complete HomeServeX Platform: API, Customer, Partner, Admin Portals & Core Modules"

Write-Host "6. Pushing to GitHub main branch..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   Upload Complete! Check: https://github.com/soumyajitsarkar785/-HomeServeX" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
