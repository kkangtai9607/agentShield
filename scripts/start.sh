#!/usr/bin/env bash
# AgentShield 局域网演示启动（Linux / macOS）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "本机 IP（供局域网访问）: $(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo '请手动 ip addr 查看')"

echo "启动后端 0.0.0.0:8000 ..."
cd "$ROOT/backend"
if [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 2
echo "启动前端 0.0.0.0:5173 ..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null' EXIT

echo "本机: http://localhost:5173"
echo "局域网: http://$(hostname -I 2>/dev/null | awk '{print $1}'):5173"
wait
