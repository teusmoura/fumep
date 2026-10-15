# Runs the media browser journey against disposable local migration services.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pairs = @{}
Get-Content (Join-Path $root '.env') | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $pairs[$parts[0]] = $parts[1].Trim('"')
}
$databaseUri = [Uri]$pairs['DATABASE_URL']
if ($databaseUri.Scheme -ne 'postgresql' -or $databaseUri.Host -notin @('localhost', '127.0.0.1') -or $databaseUri.AbsolutePath -ne '/portal_fumep') {
    throw 'Apenas o PostgreSQL local da migração pode ser usado.'
}
$redisUri = [Uri]$pairs['REDIS_URL']
if ($redisUri.Scheme -ne 'redis' -or $redisUri.Host -notin @('localhost', '127.0.0.1') -or $redisUri.AbsolutePath -notin @('/', '/0')) {
    throw 'Apenas Redis local de origem padrão pode ser usado.'
}
if (Get-NetTCPConnection -State Listen -LocalPort 8004, 3004 -ErrorAction SilentlyContinue) {
    throw 'Portas 8004/3004 já ocupadas; o E2E não pode usar serviços preexistentes.'
}
$env:DATABASE_URL = $pairs['DATABASE_URL'] -replace '/portal_fumep$', '/portal_fumep_mig58_test'
$env:REDIS_URL = $pairs['REDIS_URL'].TrimEnd('/') + '/15'
$env:APP_ORIGIN = 'http://localhost:3004'
$env:NUXT_PUBLIC_API_BASE = 'http://localhost:8004'
$env:NUXT_API_INTERNAL = 'http://127.0.0.1:8004'
$env:MIG6_E2E_BASE_URL = 'http://localhost:3004'
$env:MINIO_ENDPOINT = '127.0.0.1:9000'
$env:MINIO_ACCESS_KEY = $pairs['MINIO_ROOT_USER']
$env:MINIO_SECRET_KEY = $pairs['MINIO_ROOT_PASSWORD']
$env:MINIO_SECURE = 'false'
function New-RandomBase64([int]$count) {
    $bytes = New-Object byte[] $count
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
$env:LOGIN_RATE_LIMIT_SECRET = New-RandomBase64 32
$env:MIG6_E2E_EMAIL = "mig6-media-$([guid]::NewGuid().ToString('N'))@example.com"
$env:MIG6_E2E_PASSWORD = New-RandomBase64 24

$python = (Resolve-Path (Join-Path $root 'apps/backend/.venv/Scripts/python.exe')).Path
$backend = (Resolve-Path (Join-Path $root 'apps/backend')).Path
$portal = (Resolve-Path (Join-Path $root 'apps/portal')).Path
$nuxt = (Resolve-Path (Join-Path $root 'apps/portal/.output/server/index.mjs')).Path
$seed = @'
import os
from uuid import uuid4
from sqlalchemy import text
from app.database import database_engine
from app.passwords import NewPasswordInput, hash_new_password
engine = database_engine()
with engine.begin() as db:
    db.execute(text("INSERT INTO users (id, name, email, password_hash, role) VALUES (:id, 'Media E2E', :email, :hash, 'ADMIN')"), {"id": uuid4(), "email": os.environ["MIG6_E2E_EMAIL"], "hash": hash_new_password(NewPasswordInput(password=os.environ["MIG6_E2E_PASSWORD"]))})
engine.dispose()
'@
$cleanup = @'
import os
from sqlalchemy import text
from app.database import database_engine
from minio import Minio
engine = database_engine()
keys = []
with engine.begin() as db:
    uid = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": os.environ["MIG6_E2E_EMAIL"]}).scalar_one_or_none()
    if uid:
        keys.extend(db.execute(text("SELECT storage_key FROM media WHERE uploaded_by = :uid"), {"uid": uid}).scalars())
        keys.extend(db.execute(text("SELECT v.storage_key FROM media_variants v JOIN media m ON m.id = v.media_id WHERE m.uploaded_by = :uid"), {"uid": uid}).scalars())
        db.execute(text("DELETE FROM media_usages WHERE media_id IN (SELECT id FROM media WHERE uploaded_by = :uid)"), {"uid": uid})
        db.execute(text("DELETE FROM audit_logs WHERE user_id = :uid OR entity_id IN (SELECT id FROM media WHERE uploaded_by = :uid)"), {"uid": uid})
        db.execute(text("DELETE FROM media WHERE uploaded_by = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM media_categories WHERE created_by = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
engine.dispose()
client = Minio(os.environ["MINIO_ENDPOINT"], access_key=os.environ["MINIO_ACCESS_KEY"], secret_key=os.environ["MINIO_SECRET_KEY"], secure=False)
for key in keys:
    client.remove_object("portal-private", key)
'@

$api = $null
$worker = $null
$site = $null
try {
    Push-Location $backend
    try {
        $seed | & $python -
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar ADMIN efêmero.' }
    } finally { Pop-Location }
    $api = Start-Process -FilePath $python -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8004') -WorkingDirectory $backend -WindowStyle Hidden -PassThru
    $worker = Start-Process -FilePath $python -ArgumentList @('-m', 'app.media_worker_main') -WorkingDirectory $backend -WindowStyle Hidden -PassThru
    $env:NITRO_PORT = '3004'
    $site = Start-Process -FilePath (Get-Command node).Source -ArgumentList @($nuxt) -WorkingDirectory $portal -WindowStyle Hidden -PassThru
    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            $apiResponse = Invoke-WebRequest 'http://127.0.0.1:8004/api/v1/health' -UseBasicParsing -TimeoutSec 2
            $siteResponse = Invoke-WebRequest 'http://localhost:3004/admin/media' -UseBasicParsing -TimeoutSec 2
            if ($apiResponse.StatusCode -eq 200 -and $siteResponse.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) { throw 'Serviços locais do E2E não iniciaram.' }
    Push-Location $portal
    try {
        pnpm test:e2e e2e/media-library.e2e.ts
        if ($LASTEXITCODE -ne 0) { throw "E2E falhou ($LASTEXITCODE)." }
    } finally { Pop-Location }
} finally {
    foreach ($process in @($site, $worker, $api)) {
        if ($null -ne $process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    }
    Push-Location $backend
    try {
        $cleanup | & $python -
        if ($LASTEXITCODE -ne 0) { Write-Warning 'Limpeza do E2E falhou.' }
    } finally { Pop-Location }
}
