param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$status = git status --porcelain
if (-not $status) {
  Write-Host "No hay cambios pendientes para subir."
  exit 0
}

if (-not $Message) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  $Message = "Guardar avance $stamp"
}

git add .
git commit -m $Message
git push origin main

Write-Host "Cambios guardados en GitHub."
