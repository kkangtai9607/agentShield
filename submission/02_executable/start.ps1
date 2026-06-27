# AgentShield 一键启动脚本 (Windows)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "启动 AgentShield 后端..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2

Write-Host "启动 AgentShield 前端..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "后端: http://localhost:8000"
Write-Host "前端: http://localhost:5173"
