#!/usr/bin/env bash
# 从本机（能访问 GitHub 的环境）同步代码到国内云服务器
# 用法: bash deploy/sync-to-server.sh root@你的服务器IP
# 示例: bash deploy/sync-to-server.sh root@114.215.209.144

set -euo pipefail

TARGET="${1:-}"
APP_ROOT="${APP_ROOT:-/opt/agentshield}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${TARGET}" ]; then
  echo "用法: bash deploy/sync-to-server.sh root@服务器IP"
  exit 1
fi

echo "==> 同步 ${SRC} -> ${TARGET}:${APP_ROOT}"
rsync -avz --delete \
  --exclude '.git' \
  --exclude '.venv' \
  --exclude 'node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'backend/.env' \
  --exclude 'backend/agentshield.db' \
  --exclude 'backend/.pytest_cache' \
  --exclude 'deploy/DEPLOY-114.215.209.144.md' \
  "${SRC}/" "${TARGET}:${APP_ROOT}/"

echo "==> 远程部署"
ssh "${TARGET}" "cd ${APP_ROOT} && sudo bash deploy/deploy.sh"

echo "完成: http://114.215.209.144:8088"
