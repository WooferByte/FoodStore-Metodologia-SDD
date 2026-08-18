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

# Step 2: Remove legacy local data directory (data now lives in Docker named volume)
Write-Host "🗑️  Step 2: Removing legacy data/postgres (named volume replaces bind mount)..." -ForegroundColor Yellow
Remove-Item -LiteralPath "data/postgres" -Recurse -Force -ErrorAction SilentlyContinue

# Step 3: Start PostgreSQL
Write-Host "🐘 Step 3: Starting PostgreSQL container..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "   ⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# Step 4: Run Alembic migrations (using backend venv)
Write-Host "📊 Step 4: Running Alembic migrations..." -ForegroundColor Yellow
Set-Location backend
& ".\.venv\Scripts\python.exe" -m alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Seed the database (using backend venv)
Write-Host "🌱 Step 5: Seeding database with test data..." -ForegroundColor Yellow
& ".\.venv\Scripts\python.exe" scripts/seed.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Seed failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Step 6 (optional): Verify backend responds if already running
Write-Host "🔍 Step 6: Checking backend status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Backend responds at http://localhost:8000/docs (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️  Backend not running yet — start it with the command in 'Next steps'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Backend:  cd backend && .\.venv\Scripts\python.exe -m uvicorn main:app --reload" -ForegroundColor Gray
Write-Host "   2. Frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "🔑 Test credentials:" -ForegroundColor Cyan
Write-Host "   • admin@foodstore.com / admin123456 (ADMIN)" -ForegroundColor Gray
Write-Host "   • cliente@foodstore.com / cliente123456 (CLIENT)" -ForegroundColor Gray
Write-Host ""
