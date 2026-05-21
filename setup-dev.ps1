# Food Store - Development Environment Setup
# Run this after git pull or if Docker container state is corrupted
# Usage: .\setup-dev.ps1

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Food Store — Development Environment Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Step 1: Clean up old containers and volumes
Write-Host ""
Write-Host "📋 Step 1: Cleaning up old containers and volumes..." -ForegroundColor Yellow
docker-compose down -v 2>$null
docker volume prune -f 2>$null

# Step 2: Remove local data directory to ensure fresh state
Write-Host "🗑️  Step 2: Removing local data directory..." -ForegroundColor Yellow
Remove-Item -LiteralPath "data/postgres" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "data/postgres" -Force | Out-Null

# Step 3: Start PostgreSQL
Write-Host "🐘 Step 3: Starting PostgreSQL container..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "   ⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# Step 4: Run Alembic migrations
Write-Host "📊 Step 4: Running Alembic migrations..." -ForegroundColor Yellow
Set-Location backend
alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Seed the database
Write-Host "🌱 Step 5: Seeding database with test data..." -ForegroundColor Yellow
python scripts/seed.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Seed failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Backend:  cd backend && python -m uvicorn main:app --reload" -ForegroundColor Gray
Write-Host "   2. Frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "🔑 Test credentials:" -ForegroundColor Cyan
Write-Host "   • admin@foodstore.com / admin123456 (ADMIN)" -ForegroundColor Gray
Write-Host "   • cliente@foodstore.com / cliente123456 (CLIENT)" -ForegroundColor Gray
Write-Host ""
