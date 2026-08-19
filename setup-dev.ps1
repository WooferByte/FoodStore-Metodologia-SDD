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

# Devuelve la version de una herramienta (o $null si no esta en PATH).
# Normaliza stderr (los programas nativos lo emiten como ErrorRecord).
function Get-ToolVersion {
    param([string]$Exe, [string[]]$ToolArgs, [string]$Pattern)
    try {
        $out = (& $Exe @ToolArgs 2>&1 | ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_ }
        }) -join "`n"
    } catch {
        return $null
    }
    if ($out -match $Pattern) { return $Matches[1] }
    return $null
}

# Ejecuta docker normalizando stderr a texto. Evita el NativeCommandError de PS 5.1
# que con $ErrorActionPreference = "Stop" mata el script cuando docker escribe
# su progreso ("Container ... Stopping") en stderr.
function Invoke-DockerCapture([string[]]$DockerArgs) {
    $lines = & docker @DockerArgs 2>&1 | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_ }
    }
    return ($lines -join "`n")
}

# Variante silenciosa: ejecuta docker descartando el output normalizado.
function Invoke-DockerQuiet([string[]]$DockerArgs) {
    Invoke-DockerCapture @DockerArgs | Out-Null
    return $LASTEXITCODE
}

# Script que corre en un runspace en background: ejecuta el comando nativo,
# captura stdout+stderr y devuelve el exit code REAL de la aplicacion.
$ShowSpinnerScript = @'
param($fp, $argsA, $wd)
Set-Location -LiteralPath $wd
$out = (& $fp @argsA 2>&1 | ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_ }
}) -join "`n"
[pscustomobject]@{ Code = $LASTEXITCODE; Output = $out }
'@

# Muestra un spinner animado (caracteres braille) mientras un paso largo corre
# en background (runspace). Al terminar escribe "✅ DoneMessage" (verde) o
# "❌ Message" (rojo) con las ultimas lineas del error y sale con exit 1.
function Show-Spinner {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$Message,
        [string]$DoneMessage = $Message,
        [string]$WorkDir = $PWD
    )
    $ps = [System.Management.Automation.PowerShell]::Create()
    [void]$ps.AddScript($ShowSpinnerScript)
    [void]$ps.AddArgument($FilePath)
    [void]$ps.AddArgument($Arguments)
    [void]$ps.AddArgument($WorkDir)
    $async = $ps.BeginInvoke()
    $frames = @('⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏')
    $i = 0
    while (-not $async.IsCompleted) {
        Write-Host "`r  $($frames[$i % $frames.Count]) $Message" -NoNewline
        $i++
        Start-Sleep -Milliseconds 150
    }
    $result = $null
    try {
        $result = @($ps.EndInvoke($async))[0]
    } catch {
        $result = [pscustomobject]@{ Code = -1; Output = $_.Exception.Message }
    }
    $ps.Dispose()
    Write-Host ("`r" + (" " * 110)) -NoNewline
    $code = -1
    if ($result -and ($null -ne $result.Code)) { $code = $result.Code }
    if ($code -eq 0) {
        Write-Host "`r  ✅ $DoneMessage" -ForegroundColor Green
    } else {
        Write-Host "`r  ❌ $Message" -ForegroundColor Red
        $tail = @($result.Output -split "`n" | Where-Object { $_.Trim() } | Select-Object -Last 4)
        foreach ($line in $tail) { Write-Host "     $line" -ForegroundColor DarkGray }
        exit 1
    }
}

# Espera activa (polling) hasta que PostgreSQL acepte conexiones (max 60s).
# Usa docker compose exec (nunca el container_name fijo, ya no existe).
# Muestra una barra de progreso con # en la misma linea.
function Wait-Postgres {
    param([int]$maxIntents = 20)
    Write-Host "[BD] Esperando a que PostgreSQL acepte conexiones (max $($maxIntents * 3)s)..." -ForegroundColor Cyan
    $bar = ""
    for ($i = 1; $i -le $maxIntents; $i++) {
        $ready = $false
        $result = ""
        try {
            $result = Invoke-DockerCapture @("compose", "exec", "-T", "postgres", "pg_isready", "-U", "postgres", "-d", "foodstore_db")
            if ($LASTEXITCODE -eq 0 -and $result -match "accepting connections") {
                $ready = $true
            }
        } catch {
            # El contenedor puede estar aun arrancando: no es un error fatal
            $result = ""
        }
        if ($ready) {
            Write-Host ("`r" + (" " * 100)) -NoNewline
            Write-Host "`r  ✅ PostgreSQL listo (aceptando conexiones)" -ForegroundColor Green
            return $true
        }
        $bar += "#"
        Write-Host "`r  ⏳ Esperando PostgreSQL: $bar" -NoNewline
        Start-Sleep -Seconds 3
    }
    Write-Host ""
    return $false
}

# Verifica si el contenedor de ESTE proyecto ya existe (corriendo o detenido).
# docker compose ps -a incluye contenedores detenidos: un contenedor con datos
# que esta parado NO debe tratarse como clon fresco (se perderia la BD).
function Test-ContainerExists {
    $output = Invoke-DockerCapture @("compose", "ps", "-a", "-q", "postgres")
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
        Write-Host ""
        Write-Host "[Frontend] Instalando dependencias..." -ForegroundColor Cyan
        if (Test-Path -LiteralPath (Join-Path $FRONTEND_PATH "package-lock.json")) {
            Write-Host "  npm ci (package-lock.json presente - reproducible)" -ForegroundColor Gray
            Show-Spinner -FilePath "npm.cmd" -Arguments @("ci") -WorkDir $FRONTEND_PATH `
                -Message "Instalando dependencias del frontend..." -DoneMessage "Dependencias frontend instaladas"
        } else {
            Write-Host "  npm install (sin package-lock.json)" -ForegroundColor Gray
            Show-Spinner -FilePath "npm.cmd" -Arguments @("install") -WorkDir $FRONTEND_PATH `
                -Message "Instalando dependencias del frontend..." -DoneMessage "Dependencias frontend instaladas"
        }
    } else {
        Write-Host ""
        Write-Host "[Frontend] node_modules ya existe. Se reutiliza." -ForegroundColor Gray
    }
}

# Aplica migraciones Alembic (aplica migraciones nuevas, NO toca datos)
function Update-Database {
    Show-Spinner -FilePath $venvPython -Arguments @("-m","alembic","upgrade","head") `
        -WorkDir $BACKEND_PATH -Message "Aplicando migraciones..." -DoneMessage "Migraciones aplicadas (head 011)"
}

# Ejecuta el seed de datos de prueba
function Run-Seed {
    Show-Spinner -FilePath $venvPython -Arguments @("scripts/seed.py") `
        -WorkDir $BACKEND_PATH -Message "Sembrando datos de prueba..." -DoneMessage "Base de datos sembrada (15 productos, 4 roles)"
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
# 1.5) Verificacion de prerequisitos del sistema
# ------------------------------------------------------------
Write-Host ""
Write-Host "🔍 Verificando requisitos del sistema..." -ForegroundColor Cyan
Write-Host "  ✅ Docker Desktop: disponible" -ForegroundColor Green

# Python (o py -3, el launcher de Windows)
$pyVersion = Get-ToolVersion "python" @("--version") 'Python\s+(\d+\.\d+\.\d+)'
if (-not $pyVersion) { $pyVersion = Get-ToolVersion "py" @("-3","--version") 'Python\s+(\d+\.\d+\.\d+)' }
if ($pyVersion) {
    Write-Host "  ✅ Python: $pyVersion" -ForegroundColor Green
} else {
    Write-Host "  ❌ Python no encontrado. Instalalo desde https://www.python.org/downloads/ (marcá 'Add to PATH')" -ForegroundColor Red
    exit 1
}

# Node.js
$nodeVersion = Get-ToolVersion "node" @("--version") 'v?(\d+\.\d+\.\d+)'
if ($nodeVersion) {
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ❌ Node.js no encontrado. Instalalo desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# npm (viene incluido con Node.js)
$npmVersion = Get-ToolVersion "npm" @("--version") '(\d+\.\d+\.\d+)'
if ($npmVersion) {
    Write-Host "  ✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "  ❌ npm no encontrado. Reinstala Node.js desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Git
$gitVersion = Get-ToolVersion "git" @("--version") 'git version\s+(\d+\.\d+\.\d+)'
if ($gitVersion) {
    Write-Host "  ✅ Git: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "  ❌ Git no encontrado. Instalalo desde https://git-scm.com/" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------
# 2) AUTOCURACION al inicio: limpiar restos de sesiones anteriores
#    Si una ventana se cerro con la X, uvicorn/vite/postgres pueden
#    quedar huerfanos y ocupar el puerto 5433. Esto los limpia.
#    OJO: mata CUALQUIER uvicorn/vite de la maquina, no solo del
#    proyecto. Aceptable en un script de dev (autocuracion).
# ------------------------------------------------------------
Write-Host ""
Write-Host "[Autocuracion] Limpiando procesos uvicorn/vite huerfanos (restos de sesiones anteriores)..." -ForegroundColor Cyan
Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq "python.exe" -and $_.CommandLine -match "uvicorn") -or
    ($_.Name -eq "node.exe" -and $_.CommandLine -match "vite")
} | ForEach-Object {
    Write-Host "  Limpiando proceso huerfano PID $($_.ProcessId)..." -ForegroundColor DarkYellow
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "[Autocuracion] Deteniendo postgres del proyecto si quedo corriendo..." -ForegroundColor Cyan
Invoke-DockerQuiet @("compose", "stop", "postgres") | Out-Null

Write-Host "[Autocuracion] Verificando que el puerto 5433 este libre..." -ForegroundColor Cyan
$portOwner = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $portOwner) {
    # Fallback para PowerShell viejo donde Get-NetTCPConnection no existe
    $netstatLine = netstat -ano | Select-String ":5433\s.*LISTENING" | Select-Object -First 1
    if ($netstatLine) { $portOwner = $netstatLine }
}
if ($portOwner) {
    # IMPORTANTE: Select-String devuelve MatchInfo (no string). Con .Line obtenemos
    # el string puro; .Trim() evita que un espacio/TAB inicial genere un token vacio
    # al hacer -split (que rompia el docker stop con "requires at least 1 argument").
    $ownerContainer = (docker ps --format "{{.Names}}`t{{.Ports}}" | Select-String "5433" | Select-Object -First 1).Line.Trim()
    Write-Host "  ⚠️  El puerto 5433 esta ocupado por otro contenedor:" -ForegroundColor Yellow
    Write-Host "   $ownerContainer" -ForegroundColor Yellow
    $resp = Read-Host "   ¿Desea detenerlo para liberar el 5433? [S/N] (default: N)"
    if ($resp -match "^(s|y|S|Y)$") {
        # Extrae el primer token no-espacio (nombre del contenedor) con regex:
        # mas robusto que -split (evita tokens vacios por espacios/TAB iniciales).
        $m = [regex]::Match($ownerContainer, '^\S+')
        if (-not $m.Success) {
            Write-Host "❌ No se pudo identificar el contenedor en: $ownerContainer" -ForegroundColor Red
            exit 1
        }
        $name = $m.Value
        Invoke-DockerQuiet @("stop", $name) | Out-Null
        Write-Host "  Contenedor $name detenido. Puerto 5433 liberado." -ForegroundColor Green
    } else {
        Write-Host "❌ No se puede continuar: el puerto 5433 esta ocupado." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  OK: puerto 5433 libre." -ForegroundColor Green
}

# ------------------------------------------------------------
# 3) Detectar si el contenedor del proyecto YA existe
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
# 4) Levantar PostgreSQL (nunca down/down -v: nada se destruye)
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
# 5) Backend: venv + dependencias (no rompe si recien clono el codigo)
# ------------------------------------------------------------
Ensure-Venv
Show-Spinner -FilePath $venvPython -Arguments @("-m","pip","install","-r","requirements.txt") `
    -WorkDir $BACKEND_PATH -Message "Instalando dependencias del backend..." -DoneMessage "Dependencias backend instaladas"

# ------------------------------------------------------------
# 6) Backend + Frontend: .env desde .env.example (si no existen)
# ------------------------------------------------------------
Ensure-EnvFiles

# ------------------------------------------------------------
# 7) Migraciones Alembic
# ------------------------------------------------------------
Update-Database

# ------------------------------------------------------------
# 8) Seed de datos de prueba (logica segun el contenedor)
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
# 9) Frontend: dependencias (si no existe node_modules) + .env
# ------------------------------------------------------------
Ensure-FrontendDeps

# ------------------------------------------------------------
# 10) Levantar el stack: backend (uvicorn) y frontend (vite)
#     - Si Windows Terminal existe: 2 pestanas en la misma ventana
#     - Si no: 2 ventanas cmd separadas (fallback)
# ------------------------------------------------------------
$wtPath = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\wt.exe"
$useTabs = Test-Path -LiteralPath $wtPath

Write-Host ""
if ($useTabs) {
    # wt parsea su linea con reglas CommandLineToArgvW: las comillas
    # internas de un argumento se escriben duplicadas (""). Con
    # --startingDirectory evitamos el "cd /d" y sus problemas de quoting.
    Write-Host "[Stack] Arrancando backend y frontend en pestanas de Windows Terminal..." -ForegroundColor Cyan
    $backendDirQ = $BACKEND_PATH.Replace('"', '""')
    $frontendDirQ = $FRONTEND_PATH.Replace('"', '""')

    # Pestana Backend: uvicorn en cmd /k que queda abierta
    $wtArgsBackend = "-w 0 new-tab --title Backend --startingDirectory `"$backendDirQ`" cmd /k .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
    Start-Process $wtPath -ArgumentList $wtArgsBackend
    Start-Sleep -Seconds 1

    # Pestana Frontend: vite en cmd /k que queda abierta
    $wtArgsFrontend = "-w 0 new-tab --title Frontend --startingDirectory `"$frontendDirQ`" cmd /k npm run dev"
    Start-Process $wtPath -ArgumentList $wtArgsFrontend

    Write-Host "  📌 Backend y Frontend abiertos en pestañas de la misma ventana." -ForegroundColor Green
} else {
    Write-Host "[Stack] Arrancando backend y frontend en ventanas separadas..." -ForegroundColor Cyan

    # Backend: uvicorn en una ventana cmd /k que queda abierta
    $backendCmd = "cd /d `"$BACKEND_PATH`" && .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
    Start-Process cmd -ArgumentList "/k", "`"$backendCmd`""

    # Frontend: vite en una ventana cmd /k que queda abierta
    $frontendCmd = "cd /d `"$FRONTEND_PATH`" && npm run dev"
    Start-Process cmd -ArgumentList "/k", "`"$frontendCmd`""
}

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
# 12) Resumen final + cierre con tecla (detiene todo y libera 5433)
# ------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Aplicacion lista!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "   Backend docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "   Credenciales de prueba:" -ForegroundColor Yellow
Write-Host "     Admin:    admin@foodstore.com / admin123456" -ForegroundColor Yellow
Write-Host "     Cliente:  cliente@foodstore.com / cliente123456" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 MANTENGA ESTA VENTANA ABIERTA mientras usa la aplicacion." -ForegroundColor Yellow
Write-Host "   Si la cierra con la X, no pasa nada: el proximo setup limpia todo solo." -ForegroundColor DarkYellow
Write-Host ""
Write-Host "⏹️  Presione cualquier tecla para DETENER la aplicacion y liberar el puerto 5433..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`nDeteniendo backend y frontend..." -ForegroundColor Yellow
Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq "python.exe" -and $_.CommandLine -match "uvicorn") -or
    ($_.Name -eq "node.exe" -and $_.CommandLine -match "vite")
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host "Deteniendo PostgreSQL..." -ForegroundColor Yellow
Invoke-DockerQuiet @("compose", "stop", "postgres") | Out-Null
Write-Host "✅ Todo detenido. Puerto 5433 liberado. Volvé a ejecutar setup-dev.bat para levantar de nuevo." -ForegroundColor Green
