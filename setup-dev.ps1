# ============================================================
#  Food Store - Setup de Desarrollo Inteligente (Windows)
#  Doble clic en setup-dev.bat o: powershell -File setup-dev.ps1
#
#  NO DESTRUCTIVO por defecto: NUNCA ejecuta docker compose down
#  ni down -v. Detecta si el contenedor del proyecto ya existe:
#    - Contenedor NUEVO (clon fresco / BD vacia): seed automatico
#    - Contenedor EXISTENTE (uso diario): pregunta antes del seed
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
$venvPython = Join-Path $BACKEND_PATH ".venv\Scripts\python.exe"

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

# Espera activa (polling) hasta que PostgreSQL acepte conexiones (max 60s).
# Usa docker compose exec (nunca el container_name fijo, ya no existe).
function Wait-Postgres {
    param([int]$maxIntents = 20)
    Write-Host "[BD] Esperando a que PostgreSQL acepte conexiones (max $($maxIntents * 3)s)..." -ForegroundColor Cyan
    for ($i = 1; $i -le $maxIntents; $i++) {
        $ready = $false
        $result = ""
        try {
            $result = docker compose exec -T postgres pg_isready -U postgres -d foodstore_db 2>$null
            if ($LASTEXITCODE -eq 0 -and $result -match "accepting connections") {
                $ready = $true
            }
        } catch {
            # El contenedor puede estar aun arrancando: no es un error fatal
            $result = ""
        }
        if ($ready) {
            Write-Host "  OK: PostgreSQL listo ($result)" -ForegroundColor Green
            return $true
        }
        Write-Host "  ...intento $i/$maxIntents ($($i * 3)s). Aun no esta listo..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
    return $false
}

# Verifica si el contenedor de ESTE proyecto ya existe (corriendo o detenido).
# docker compose ps -a incluye contenedores detenidos: un contenedor con datos
# que esta parado NO debe tratarse como clon fresco (se perderia la BD).
function Test-ContainerExists {
    $output = docker compose ps -a -q postgres 2>$null
    return ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($output))
}

# Garantiza que el venv del backend exista (actualizando pip si lo crea)
function Ensure-Venv {
    if (-not (Test-Path -LiteralPath $venvPython)) {
        Write-Host ""
        Write-Host "[Backend] Creando entorno virtual (.venv)..." -ForegroundColor Cyan
        if (-not (Test-Path -LiteralPath $BACKEND_PATH)) {
            Fail "No se encontro la carpeta backend/ en $ROOT"
        }
        Push-Location $BACKEND_PATH
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  fallback: python no encontrado, probando 'py -3'..." -ForegroundColor Yellow
            py -3 -m venv .venv
        }
        Pop-Location
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $venvPython)) {
            Fail "No se pudo crear el venv. Instala Python 3.10+ y volve a ejecutar."
        }
        Invoke-Checked "Backend: actualizar pip" { & $venvPython -m pip install --upgrade pip }
    } else {
        Write-Host ""
        Write-Host "[Backend] venv ya existe (.venv). Se reutiliza." -ForegroundColor Gray
    }
}

# Crea backend/.env y frontend/.env desde sus .env.example si no existen
function Ensure-EnvFiles {
    if (-not (Test-Path -LiteralPath (Join-Path $BACKEND_PATH ".env"))) {
        Write-Host ""
        Write-Host "[Backend] Creando backend/.env desde backend/.env.example..." -ForegroundColor Cyan
        Copy-Item -LiteralPath (Join-Path $BACKEND_PATH ".env.example") -Destination (Join-Path $BACKEND_PATH ".env")
    } else {
        Write-Host ""
        Write-Host "[Backend] backend/.env ya existe. Se reutiliza." -ForegroundColor Gray
    }
    if (-not (Test-Path -LiteralPath (Join-Path $FRONTEND_PATH ".env"))) {
        Write-Host ""
        Write-Host "[Frontend] Creando frontend/.env desde frontend/.env.example..." -ForegroundColor Cyan
        Copy-Item -LiteralPath (Join-Path $FRONTEND_PATH ".env.example") -Destination (Join-Path $FRONTEND_PATH ".env")
    } else {
        Write-Host ""
        Write-Host "[Frontend] frontend/.env ya existe. Se reutiliza." -ForegroundColor Gray
    }
}

# Instala dependencias del frontend solo si no existe node_modules
function Ensure-FrontendDeps {
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
}

# Aplica migraciones Alembic (aplica migraciones nuevas, NO toca datos)
function Update-Database {
    Set-Location $BACKEND_PATH
    Invoke-Checked "Backend: alembic upgrade head" { & $venvPython -m alembic upgrade head }
    Set-Location $ROOT
}

# Ejecuta el seed de datos de prueba
function Run-Seed {
    Set-Location $BACKEND_PATH
    Invoke-Checked "Backend: seed (scripts/seed.py)" { & $venvPython scripts/seed.py }
    Set-Location $ROOT
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Food Store - Setup Inteligente (no destructivo)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Directorio del proyecto: $ROOT"

# ------------------------------------------------------------
# 1) Verificar que Docker Desktop este corriendo
# ------------------------------------------------------------
Write-Host ""
Write-Host "[Docker] Verificando que Docker Desktop este corriendo..." -ForegroundColor Cyan
try {
    docker info *> $null
} catch {
    Fail "Docker Desktop no esta corriendo. Inicialo y volve a ejecutar."
}
if ($LASTEXITCODE -ne 0) {
    Fail "Docker Desktop no esta corriendo. Inicialo y volve a ejecutar."
}
Write-Host "  OK: Docker disponible." -ForegroundColor Green

# ------------------------------------------------------------
# 2) Detectar si el contenedor del proyecto YA existe
# ------------------------------------------------------------
$containerExists = Test-ContainerExists
if ($containerExists) {
    Write-Host ""
    Write-Host "[BD] Contenedor del proyecto detectado (existente). Uso diario: NO se borra nada." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[BD] No hay contenedor previo para este proyecto (clon fresco o BD nueva)." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 3) Levantar PostgreSQL (nunca down/down -v: nada se destruye)
# ------------------------------------------------------------
Write-Host ""
Write-Host "[BD] Levantando contenedor PostgreSQL (up -d)..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Fail "Fallo 'docker compose up -d'. Revisa el mensaje de arriba."
}

if (-not (Wait-Postgres)) {
    Fail "PostgreSQL no acepto conexiones en 60s. Revisa: docker compose logs postgres"
}

# ------------------------------------------------------------
# 4) Backend: venv + dependencias (no rompe si recien clono el codigo)
# ------------------------------------------------------------
Ensure-Venv
Set-Location $BACKEND_PATH
Invoke-Checked "Backend: pip install -r requirements.txt" {
    & $venvPython -m pip install -r requirements.txt
}
Set-Location $ROOT

# ------------------------------------------------------------
# 5) Backend + Frontend: .env desde .env.example (si no existen)
# ------------------------------------------------------------
Ensure-EnvFiles

# ------------------------------------------------------------
# 6) Migraciones Alembic
# ------------------------------------------------------------
Update-Database

# ------------------------------------------------------------
# 7) Seed de datos de prueba (logica segun el contenedor)
# ------------------------------------------------------------
if ($containerExists) {
    # Uso diario: pregunta interactiva, nunca borra datos sin consentimiento
    Write-Host ""
    Write-Host "❓ ¿Desea ejecutar el seed para cargar datos de ejemplo?" -ForegroundColor Yellow
    Write-Host "   ⚠️ ADVERTENCIA: si ejecuta el seed, se BORRARÁN todos los datos actuales" -ForegroundColor Red
    Write-Host "   para reemplazarlos por los del seed." -ForegroundColor Red
    $respuesta = Read-Host "   ¿Desea continuar? [S/N] (default: N)"
    if ($respuesta -match "^(s|S|y|Y)") {
        Run-Seed
    } else {
        Write-Host ""
        Write-Host "Seed omitido — se conservan los datos actuales." -ForegroundColor Gray
    }
} else {
    # Clon fresco / BD nueva vacia: no hay nada que perder, seed automatico
    Write-Host ""
    Write-Host "[BD] BD nueva (contenedor recien creado): ejecutando seed inicial..." -ForegroundColor Cyan
    Run-Seed
}

# ------------------------------------------------------------
# 8) Frontend: dependencias (si no existe node_modules) + .env
# ------------------------------------------------------------
Ensure-FrontendDeps

# ------------------------------------------------------------
# 9) Levantar el stack: backend (uvicorn) y frontend (vite)
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
# 10) Verificar que backend y frontend respondan
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
# 11) Resumen final
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
