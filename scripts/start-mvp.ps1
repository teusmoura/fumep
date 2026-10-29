# Starts the local FastAPI/Nuxt demonstration. Keep this terminal open; Ctrl+C stops app processes.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) { throw 'Arquivo .env ausente na raiz do projeto.' }

$settings = @{}
Get-Content $envFile | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $settings[$parts[0]] = $parts[1].Trim('"')
}
$database = [Uri]$settings['DATABASE_URL']
$redis = [Uri]$settings['REDIS_URL']
if ($database.Scheme -ne 'postgresql' -or $database.Host -notin @('localhost', '127.0.0.1') -or $database.AbsolutePath -ne '/portal_fumep') {
    throw 'DATABASE_URL deve apontar para portal_fumep no PostgreSQL local; o script só usará o banco dedicado.'
}
if ($redis.Scheme -ne 'redis' -or $redis.Host -notin @('localhost', '127.0.0.1') -or $redis.AbsolutePath -notin @('/', '/0')) {
    throw 'REDIS_URL deve apontar para o Redis local.'
}
if (-not $settings['MINIO_ROOT_USER'] -or -not $settings['MINIO_ROOT_PASSWORD']) {
    throw 'Credenciais locais do MinIO ausentes no .env.'
}
if (Get-NetTCPConnection -State Listen -LocalPort 8002, 3002 -ErrorAction SilentlyContinue) {
    throw 'Portas 8002/3002 ocupadas. Encerre os serviços anteriores antes de iniciar a demonstração.'
}

$python = (Resolve-Path (Join-Path $root 'apps/backend/.venv/Scripts/python.exe')).Path
$node = (Get-Command node -ErrorAction Stop).Source
$backend = Join-Path $root 'apps/backend'
$portal = Join-Path $root 'apps/portal'
$nuxt = Join-Path $portal '.output/server/index.mjs'
if (-not (Test-Path (Join-Path $portal 'node_modules/nuxt'))) {
    throw 'Dependências Nuxt ausentes. Execute pnpm install na raiz.'
}

Write-Host 'Iniciando PostgreSQL, Redis e MinIO locais...'
Push-Location $root
try {
    docker compose -f docker-compose.dev.yml up -d --wait postgres redis minio
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose não iniciou os serviços.' }
} finally { Pop-Location }

$env:DATABASE_URL = $settings['DATABASE_URL'] -replace '/portal_fumep$', '/portal_fumep_mig58_test'
$env:FUMEP_MIGRATION_DATABASE_URL = $env:DATABASE_URL
$env:REDIS_URL = $settings['REDIS_URL']
$env:APP_ORIGIN = 'http://localhost:3002'
$env:NUXT_PUBLIC_API_BASE = 'http://localhost:8002'
$env:NUXT_API_INTERNAL = 'http://127.0.0.1:8002'
$env:MINIO_ENDPOINT = '127.0.0.1:9000'
$env:MINIO_ACCESS_KEY = $settings['MINIO_ROOT_USER']
$env:MINIO_SECRET_KEY = $settings['MINIO_ROOT_PASSWORD']
$env:MINIO_SECURE = 'false'
$env:FUMEP_LOCAL_DEMO_LOGIN = '1'
$secretBytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($secretBytes) } finally { $rng.Dispose() }
$env:LOGIN_RATE_LIMIT_SECRET = [Convert]::ToBase64String($secretBytes)

Write-Host 'Aplicando migrations somente no banco dedicado...'
Push-Location $backend
try {
    & $python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Falha nas migrations do banco dedicado.' }
} finally { Pop-Location }

Write-Host 'Preparando o frontend Nuxt...'
Push-Location $root
try {
    pnpm --filter @fumep/portal build | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Falha no build do Nuxt.' }
} finally { Pop-Location }

$api = $null
$worker = $null
$site = $null
try {
    $api = Start-Process -FilePath $python -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8002') -WorkingDirectory $backend -WindowStyle Hidden -PassThru
    $worker = Start-Process -FilePath $python -ArgumentList @('-m', 'app.media_worker_main') -WorkingDirectory $backend -WindowStyle Hidden -PassThru
    $env:NITRO_PORT = '3002'
    $site = Start-Process -FilePath $node -ArgumentList @($nuxt) -WorkingDirectory $portal -WindowStyle Hidden -PassThru
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        if ($api.HasExited -or $worker.HasExited -or $site.HasExited) { break }
        Start-Sleep -Seconds 1
        try {
            $apiResponse = Invoke-WebRequest 'http://127.0.0.1:8002/api/v1/health' -UseBasicParsing -TimeoutSec 2
            $siteResponse = Invoke-WebRequest 'http://localhost:3002/admin/media' -UseBasicParsing -TimeoutSec 2
            if ($apiResponse.StatusCode -eq 200 -and $siteResponse.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) { throw 'API ou Nuxt não iniciou em 30 segundos.' }
    Write-Host 'Portal pronto: http://localhost:3002/admin/media'
    Write-Host 'Paginas: http://localhost:3002/admin/pages'
    Write-Host 'Noticias: http://localhost:3002/admin/noticias'
    Write-Host 'API: http://127.0.0.1:8002/docs'
    Write-Host 'Use os botoes de acesso de demonstracao em /admin/media. Ctrl+C encerra API, Worker e Nuxt.'
    while ($true) {
        if ($api.HasExited -or $worker.HasExited -or $site.HasExited) { throw 'Um processo da demonstração parou.' }
        Start-Sleep -Seconds 2
    }
} finally {
    foreach ($process in @($site, $worker, $api)) {
        if ($null -ne $process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    }
}
