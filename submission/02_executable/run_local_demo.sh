#!/usr/bin/env bash
# AgentShield local demo launcher (Linux / macOS)
# Run from repository root or from 02_executable after unzip.
set -euo pipefail

if [ -d backend ] && [ -d frontend ]; then
  ROOT="$(pwd)"
elif [ -d ../backend ] && [ -d ../frontend ]; then
  ROOT="$(cd .. && pwd)"
else
  echo "Error: run from AgentShield root (contains backend/ and frontend/)"
  exit 1
fi

cd "${ROOT}/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -U pip
pip install -q -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
fi

cd "${ROOT}/frontend"
if [ ! -d node_modules ]; then
  npm install
fi

echo "Starting backend :8000 and frontend :5173 ..."
cd "${ROOT}/backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BPID=$!
sleep 2
cd "${ROOT}/frontend"
npm run dev &
FPID=$!

trap 'kill $BPID $FPID 2>/dev/null' EXIT
echo "Open http://localhost:5173"
echo "Demo login: student01 / student123"
wait
