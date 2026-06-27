# AgentShield local demo launcher (Windows PowerShell)
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path "$Root\backend")) { $Root = Split-Path -Parent $Root }

Set-Location "$Root\backend"
if (-not (Test-Path .venv)) { python -m venv .venv }
& .\.venv\Scripts\Activate.ps1
pip install -q -U pip
pip install -q -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

Set-Location "$Root\frontend"
if (-not (Test-Path node_modules)) { npm install }

Write-Host "Starting backend :8000 and frontend :5173 ..."
Start-Process -NoNewWindow python -ArgumentList "-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000" -WorkingDirectory "$Root\backend"
Start-Sleep -Seconds 2
Set-Location "$Root\frontend"
npm run dev
Write-Host "Open http://localhost:5173  Demo: student01 / student123"
