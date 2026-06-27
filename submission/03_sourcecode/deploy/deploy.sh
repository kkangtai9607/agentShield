#!/usr/bin/env bash
# AgentShield 生产部署脚本（在阿里云服务器上执行）
# 用法: sudo bash deploy/deploy.sh
# 前提: 代码已在 /opt/agentshield，且已配置 backend/.env

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/agentshield}"
WEB_ROOT="${WEB_ROOT:-/var/www/agentshield}"
SERVICE_NAME="${SERVICE_NAME:-agentshield}"

echo "==> AgentShield 部署 @ ${APP_ROOT}"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 sudo 运行: sudo bash deploy/deploy.sh"
  exit 1
fi

if [ ! -f "${APP_ROOT}/backend/.env" ]; then
  echo "缺少 ${APP_ROOT}/backend/.env"
  echo "请先: cp deploy/.env.production.example backend/.env 并修改 JWT_SECRET"
  exit 1
fi

echo "==> 后端依赖"
cd "${APP_ROOT}/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q -U pip
.venv/bin/pip install -q -r requirements.txt

echo "==> 前端构建"
cd "${APP_ROOT}/frontend"
if [ ! -d node_modules ]; then
  npm ci --prefer-offline || npm install
fi
npm run build

echo "==> 发布静态文件 -> ${WEB_ROOT}"
mkdir -p "${WEB_ROOT}"
rsync -a --delete "${APP_ROOT}/frontend/dist/" "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}"

echo "==> 数据目录权限"
mkdir -p "${APP_ROOT}/backend/app/sandbox"
chown -R www-data:www-data "${APP_ROOT}/backend"
touch "${APP_ROOT}/backend/agentshield.db" 2>/dev/null || true
chown www-data:www-data "${APP_ROOT}/backend/agentshield.db" 2>/dev/null || true

echo "==> systemd"
cp "${APP_ROOT}/deploy/systemd/agentshield.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "==> ACME webroot（certbot 用）"
mkdir -p /var/www/certbot/.well-known/acme-challenge
chmod -R 755 /var/www/certbot

echo "==> nginx upstream（全局一份）"
cp "${APP_ROOT}/deploy/nginx/agentshield-upstream.conf" /etc/nginx/conf.d/agentshield-upstream.conf

echo "==> nginx 配置"
NGINX_DST="/etc/nginx/sites-available/agentshieldtop.xyz.conf"
if [ -f /etc/letsencrypt/live/agentshieldtop.xyz/fullchain.pem ]; then
  cp "${APP_ROOT}/deploy/nginx/agentshieldtop.xyz.conf" "${NGINX_DST}"
  echo "    使用 HTTPS 完整配置"
else
  cp "${APP_ROOT}/deploy/nginx/agentshieldtop.xyz.initial.conf" "${NGINX_DST}"
  echo "    使用 HTTP 初版配置（申请证书: certbot --nginx -d agentshieldtop.xyz -d www.agentshieldtop.xyz）"
fi
ln -sf "${NGINX_DST}" /etc/nginx/sites-enabled/agentshieldtop.xyz.conf

if nginx -t; then
  systemctl reload nginx
else
  echo "WARN: nginx -t 失败，请检查 ${NGINX_DST}"
fi

# 可选：公网 IP:8088 演示入口（无域名场景）
IP_PORT_CONF="${APP_ROOT}/deploy/nginx/agentshield-ip-8088.conf"
if [ -f "${IP_PORT_CONF}" ]; then
  cp "${IP_PORT_CONF}" /etc/nginx/sites-available/agentshield-ip-8088.conf
  ln -sf /etc/nginx/sites-available/agentshield-ip-8088.conf /etc/nginx/sites-enabled/agentshield-ip-8088.conf
  if nginx -t; then
    systemctl reload nginx
    echo "    已启用 IP:8088 演示入口 http://<公网IP>:8088"
  fi
fi

echo ""
echo "部署完成。检查:"
echo "  systemctl status ${SERVICE_NAME}"
echo "  curl -s http://127.0.0.1:8001/health"
echo "  浏览器访问 http://114.215.209.144:8088"
echo ""
echo "演示账号: student01/student123  teacher01/teacher123  admin01/admin123"
