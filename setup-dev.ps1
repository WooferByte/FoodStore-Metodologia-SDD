# ============================================================
#  Food Store - Setup One-Click de Desarrollo (Windows)
#  Doble clic en setup-dev.bat o: powershell -File setup-dev.ps1
#
#  Levanta TODO en un clon fresco:
#    PostgreSQL (Docker Compose) -> migraciones Alembic -> seed
#    -> venv backend + deps -> .env backend -> uvicorn
#    -> deps frontend + .env frontend -> vite
# ============================================================

# Ejecutable en PowerShell 5.1 (Windows). Errores NO silenciosos.
$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# 0) Contexto del script: funciona desde CUALQUIER directorio
# ------------------------------------------------------------
Set-Location $PSScriptRoot
$ROOT = $PSScriptRoot
$BACKEND_PATH = Join-Path $ROOT "backend"
$FRONTEND_PATH = Join-Path $ROOT "frontend"

# ------------------------------------------------------------
# Funciones auxiliares
# ------------------------------------------------------------

# Muestra un error en rojo y sale con codigo 1
function Fail([string]$msg) {
    Write-Host ""
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit 1
}

# Ejecuta un comando nativo y aborta si devuelve codigo != 0
function Invoke-Checked([string]$label, [scriptblock]$scriptBlock) {
    Write-Host ""
    Write-Host "[$label]" -ForegroundColor Cyan
    & $scriptBlock
    if ($LASTEXITCODE -ne 0) {
        Fail "Fallo '$label' (exit code $LASTEXITCODE). Revisa el mensaje de arriba."
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Food Store - Setup One-Click" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Directorio del proyecto: $ROOT"

# ------------------------------------------------------------
# 1) Verificar que Docker Desktop este corriendo
# ------------------------------------------------------------
Write-Host ""
Write-Host "[Docker] Verificando que Docker Desktop este corriendo..." -ForegroundColor Cyan
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Fail "Docker Desktop no esta corriendo. Inicialo y volve a ejecutar."
}
Write-Host "  OK: Docker disponible." -ForegroundColor Green

# ------------------------------------------------------------
# 2) Base de datos: arranque limpio + espera a PostgreSQL
# ------------------------------------------------------------
Write-Host ""
Write-Host "[BD] Limpiando estado previo (down -v)..." -ForegroundColor Cyan
docker compose down -v
if ($LASTEXITCODE -ne 0) {
    Fail "Fallo 'docker compose down -v'."
}

Write-Host "[BD] Levantando contenedor PostgreSQL..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Fail "Fallo 'docker compose up -d'."
}

# Espera activa (polling) hasta que PostgreSQL acepte conexiones (max 60s)
Write-Host "[BD] Esperando a que PostgreSQL acepte conexiones..." -ForegroundColor Cyan
$ready = $false
for ($i = 1; $i -le 20; $i++) {
    $result = docker exec foodstore-postgres pg_isready -U postgres -d foodstore_db 2>$null
    if ($LASTEXITCODE -eq 0 -and $result -match "accepting connections") {
        Write-Host "  OK: PostgreSQL listo ($result)" -ForegroundColor Green
        $ready = $true
        break
    }
    Write-Host "  ...intento $i/20 ($($i * 3)s). Aun no esta listo..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
}
if (-not $ready) {
    Fail "PostgreSQL no acepto conexiones en 60s. Revisa: docker logs foodstore-postgres"
}

# ------------------------------------------------------------
# 3) Backend: venv (si no existe)
# ------------------------------------------------------------
$venvPython = Join-Path $BACKEND_PATH ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Host ""
    Write-Host "[Backend] Creando entorno virtual (.venv)..." -ForegroundColor Cyan
    if (-not (Test-Path -LiteralPath $BACKEND_PATH)) {
        Fail "No se encontro la carpeta backend/ en $ROOT"
    }
    Set-Location $BACKEND_PATH
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  fallback: python no encontrado, probando 'py -3'..." -ForegroundColor Yellow
        py -3 -m venv .venv
    }
    if ($LASTEXITCODE -ne 0) {
        Fail "No se pudo crear el venv. Instala Python 3.10+ y volve a ejecutar."
    }
    Set-Location $ROOT
} else {
    Write-Host ""
    Write-Host "[Backend] venv ya existe (.venv). Se reutiliza." -ForegroundColor Gray
}

# ------------------------------------------------------------
# 4) Backend: instalar dependencias
#    Fuente de verdad: requirements.txt (simple, determinista, sin poetry)
# ------------------------------------------------------------
Set-Location $BACKEND_PATH
Invoke-Checked "Backend: pip install -r requirements.txt" {
    & $venvPython -m pip install --upgrade pip
}
if ($LASTEXITCODE -ne 0) {
    Fail "Fallo al actualizar pip."
}
Invoke-Checked "Backend: pip install -r requirements.txt" {
    & $venvPython -m pip install -r requirements.txt
}
Set-Location $ROOT

# ------------------------------------------------------------
# 5) Backend: crear .env desde .env.example (si no existe)
# ------------------------------------------------------------
if (-not (Test-Path -LiteralPath (Join-Path $BACKEND_PATH ".env"))) {
    Write-Host ""
    Write-Host "[Backend] Creando backend/.env desde backend/.env.example..." -ForegroundColor Cyan
    Copy-Item -LiteralPath (Join-Path $BACKEND_PATH ".env.example") -Destination (Join-Path $BACKEND_PATH ".env")
} else {
    Write-Host ""
    Write-Host "[Backend] backend/.env ya existe. Se reutiliza." -ForegroundColor Gray
}

# ------------------------------------------------------------
# 6) Backend: migraciones Alembic
# ------------------------------------------------------------
Set-Location $BACKEND_PATH
Invoke-Checked "Backend: alembic upgrade head" {
    & $venvPython -m alembic upgrade head
}
Set-Location $ROOT

# ------------------------------------------------------------
# 7) Backend: seed de datos de prueba
# ------------------------------------------------------------
Set-Location $BACKEND_PATH
Invoke-Checked "Backend: seed (scripts/seed.py)" {
    & $venvPython scripts/seed.py
}
Set-Location $ROOT

# ------------------------------------------------------------
# 8) Frontend: instalar dependencias (si no existe node_modules)
#    Reproducible: npm ci (hay package-lock.json), sino npm install
# ------------------------------------------------------------
if (-not (Test-Path -LiteralPath (Join-Path $FRONTEND_PATH "node_modules"))) {
    Set-Location $FRONTEND_PATH
    Write-Host ""
    Write-Host "[Frontend] Instalando dependencias..." -ForegroundColor Cyan
    if (Test-Path -LiteralPath "package-lock.json") {
        Write-Host "  npm ci (package-lock.json presente - reproducible)" -ForegroundColor Gray
        npm ci
    } else {
        Write-Host "  npm install (sin package-lock.json)" -ForegroundColor Gray
        npm install
    }
    if ($LASTEXITCODE -ne 0) {
        Fail "Fallo al instalar dependencias del frontend."
    }
    Set-Location $ROOT
} else {
    Write-Host ""
    Write-Host "[Frontend] node_modules ya existe. Se reutiliza." -ForegroundColor Gray
}

# ------------------------------------------------------------
# 9) Frontend: crear .env desde .env.example (si no existe)
# ------------------------------------------------------------
if (-not (Test-Path -LiteralPath (Join-Path $FRONTEND_PATH ".env"))) {
    Write-Host ""
    Write-Host "[Frontend] Creando frontend/.env desde frontend/.env.example..." -ForegroundColor Cyan
    Copy-Item -LiteralPath (Join-Path $FRONTEND_PATH ".env.example") -Destination (Join-Path $FRONTEND_PATH ".env")
} else {
    Write-Host ""
    Write-Host "[Frontend] frontend/.env ya existe. Se reutiliza." -ForegroundColor Gray
}

# ------------------------------------------------------------
# 10) Levantar el stack: backend (uvicorn) y frontend (vite)
#     Cada uno en su propia ventana de cmd (visible, con logs)
# ------------------------------------------------------------
Write-Host ""
Write-Host "[Stack] Arrancando backend y frontend en ventanas separadas..." -ForegroundColor Cyan

# Backend: uvicorn en una ventana cmd /k que queda abierta
$backendCmd = "cd /d `"$BACKEND_PATH`" && .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
Start-Process cmd -ArgumentList "/k", "`"$backendCmd`""

# Frontend: vite en una ventana cmd /k que queda abierta
$frontendCmd = "cd /d `"$FRONTEND_PATH`" && npm run dev"
Start-Process cmd -ArgumentList "/k", "`"$frontendCmd`""

# ------------------------------------------------------------
# 11) Verificar que backend y frontend respondan
# ------------------------------------------------------------
Write-Host ""
Write-Host "[Stack] Verificando que backend y frontend respondan..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

$backendOk = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 5
    $backendOk = ($resp.StatusCode -eq 200)
    if ($backendOk) {
        Write-Host "  OK: Backend responde en http://localhost:8000/docs (HTTP $($resp.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "  AVISO: Backend aun no responde en /docs. Revisa su ventana." -ForegroundColor Yellow
}

$frontendOk = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 5
    $frontendOk = ($resp.StatusCode -eq 200)
    if ($frontendOk) {
        Write-Host "  OK: Frontend responde en http://localhost:5173 (HTTP $($resp.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "  AVISO: Frontend aun no responde en /. Revisa su ventana." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 12) Resumen final
# ------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Setup completado" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  - Frontend:  http://localhost:5173" -ForegroundColor Gray
Write-Host "  - Backend:   http://localhost:8000" -ForegroundColor Gray
Write-Host "  - API Docs:  http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "Credenciales de prueba:" -ForegroundColor Cyan
Write-Host "  - admin@foodstore.com / admin123456   (ADMIN)" -ForegroundColor Gray
Write-Host "  - cliente@foodstore.com / cliente123456 (CLIENT)" -ForegroundColor Gray
Write-Host ""
if (-not $backendOk -or -not $frontendOk) {
    Write-Host "Nota: alguna ventana puede haber tardado en arrancar. Si sigue sin" -ForegroundColor Yellow
    Write-Host "responder, revisa los logs en cada ventana de cmd que quedo abierta." -ForegroundColor Yellow
}
Write-Host ""
