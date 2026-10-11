# Setup local Postgres + cecyte-platform DB y schema.sql
$ErrorActionPreference = 'Stop'
$SchemaPath = 'C:\Users\adria\cecyte-platform\backend\src\db\schema.sql'
$ConnectionString = 'postgres://cecyte:cecyte123@localhost:5432/cecyte'

if (-not (Test-Path $SchemaPath)) {
    Write-Host "ERROR: schema.sql no encontrado en $SchemaPath"
    exit 1
}

Write-Host "Leyendo schema.sql..."
$schema = Get-Content $SchemaPath -Raw

Write-Host "Ejecutando en postgres (ON_ERROR_STOP=1)..."
$cmd = @"
docker compose exec -T postgres psql -U cecyte -d cecyte -v ON_ERROR_STOP=1 -c "`$schema"
"@

try {
    Invoke-Expression $cmd
    Write-Host "OK: schema aplicado correctamente."
}
catch {
    Write-Host "ERROR al aplicar schema: $_"
    exit 1
}
