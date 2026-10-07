# Cria um ADMIN apenas no banco local de demonstracao da MIG 6.
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$backendPath = Join-Path $projectRoot 'apps\backend'
$pythonPath = Join-Path $backendPath '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
    throw 'Arquivo .env local nao encontrado na raiz do projeto.'
}
if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
    throw 'Python do backend nao encontrado em apps\backend\.venv.'
}

$databaseUrl = $null
foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^DATABASE_URL=(.*)$') {
        if ($null -ne $databaseUrl) {
            throw 'DATABASE_URL duplicada no .env.'
        }
        $databaseUrl = $matches[1].Trim().Trim('"')
    }
}
if (-not $databaseUrl) {
    throw 'DATABASE_URL ausente no .env.'
}

$uri = [System.UriBuilder]::new($databaseUrl)
if ($uri.Host -notin @('localhost', '127.0.0.1') -or $uri.Path -ne '/portal_fumep') {
    throw 'O script exige DATABASE_URL local apontando para portal_fumep; nenhuma alteracao foi feita.'
}
$uri.Path = '/portal_fumep_mig58_test'

$previousDatabaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
try {
    [Environment]::SetEnvironmentVariable('DATABASE_URL', $uri.Uri.AbsoluteUri, 'Process')
    Push-Location -LiteralPath $backendPath
    try {
        & $pythonPath -m scripts.bootstrap_mig6_demo
        if ($LASTEXITCODE -ne 0) {
            throw "Bootstrap interrompido (codigo $LASTEXITCODE)."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    [Environment]::SetEnvironmentVariable('DATABASE_URL', $previousDatabaseUrl, 'Process')
}

Write-Host 'Pronto. Entre em http://localhost:3002/admin/pages com o e-mail e a senha escolhidos.'
