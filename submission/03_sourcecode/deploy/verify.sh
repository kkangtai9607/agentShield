#!/usr/bin/env bash
# 上线前自检（在服务器 /opt/agentshield 执行）
# 用法: bash deploy/verify.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/agentshield}"
DOMAIN="${DOMAIN:-114.215.209.144}"
DEMO_PORT="${DEMO_PORT:-8088}"
BACKEND_PORT="${BACKEND_PORT:-8001}"

ok=0
fail=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "[OK]   $name"
    ok=$((ok + 1))
  else
    echo "[FAIL] $name"
    fail=$((fail + 1))
  fi
}

echo "==> AgentShield 上线自检"

check "backend/.env 存在" test -f "${APP_ROOT}/backend/.env"
check "agentshield 服务 active" systemctl is-active --quiet agentshield
check "后端 health" curl -sf "http://127.0.0.1:${BACKEND_PORT}/health" | grep -q '"status":"ok"'
check "前端静态 index.html" test -f /var/www/agentshield/index.html
check "nginx 配置语法" nginx -t
check "nginx 运行中" systemctl is-active --quiet nginx

echo ""
echo "==> DNS（公网）"
A=$(dig +short "${DOMAIN}" @223.5.5.5 | head -1)
NS=$(dig +short "${DOMAIN}" NS @223.5.5.5 | head -1)
echo "    A 记录: ${A:-（无）}"
echo "    NS:     ${NS:-（无）}"

if [[ "${A}" == 11.18.0.* ]]; then
  echo "[WARN] A 为 11.18.0.x 占位 IP，请在阿里云改 DNS 服务器并设置正确 A 记录"
  fail=$((fail + 1))
elif [[ -n "${A}" ]]; then
  echo "[OK]   域名已解析到 ${A}"
  ok=$((ok + 1))
  if curl -sf -o /dev/null -H "Host: ${DOMAIN}" "http://127.0.0.1/"; then
    echo "[OK]   nginx 按域名可访问前端"
    ok=$((ok + 1))
  else
    echo "[FAIL] nginx 按域名访问前端"
    fail=$((fail + 1))
  fi
else
  echo "[FAIL] 域名未解析"
  fail=$((fail + 1))
fi

if [[ "${NS}" == *hichina.com* ]]; then
  echo "[OK]   NS 指向阿里云"
  ok=$((ok + 1))
else
  echo "[WARN] NS 未指向阿里云 hichina，certbot 可能失败"
fi

if [[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]]; then
  echo "[OK]   SSL 证书已安装"
  ok=$((ok + 1))
else
  echo "[WARN] 尚未申请 SSL，DNS 生效后: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

echo ""
echo "通过 ${ok} 项，失败/警告 ${fail} 项"
[[ "${fail}" -eq 0 ]] && echo "可以对外演示: http://${DOMAIN}:${DEMO_PORT}" || echo "请按 deploy/IP-PORT-ACCESS.md 补齐后再上线"
