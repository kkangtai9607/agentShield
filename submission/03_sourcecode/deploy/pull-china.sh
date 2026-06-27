#!/usr/bin/env bash
# 国内云服务器拉取 GitHub（github.com:443 常被阻断时使用 SSH 443）
# 用法: bash deploy/pull-china.sh
# 前提: 已在 GitHub 添加本机 SSH 公钥（Settings → SSH keys）

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/agentshield}"
REPO="git@github.com:huang08666/agentShield.git"
BRANCH="${BRANCH:-main}"

cd "${APP_ROOT}"

if [ ! -d .git ]; then
  echo "错误: ${APP_ROOT} 不是 git 仓库，请先 git clone 或从本机 rsync 同步"
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh
if ! grep -q 'Host github.com' ~/.ssh/config 2>/dev/null; then
  cat >> ~/.ssh/config <<'EOF'

# GitHub via 443（国内服务器 github.com:443 不可达时）
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
EOF
  chmod 600 ~/.ssh/config
  echo "已写入 ~/.ssh/config（SSH 走 443）"
fi

if [ ! -f ~/.ssh/id_ed25519 ]; then
  echo "未找到 ~/.ssh/id_ed25519"
  echo "请执行: ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519"
  echo "然后把公钥添加到 GitHub: cat ~/.ssh/id_ed25519.pub"
  exit 1
fi

echo "==> 测试 GitHub SSH（443）"
if ! ssh -T -o ConnectTimeout=20 git@github.com 2>&1 | grep -qi 'successfully authenticated\|Hi '; then
  echo "SSH 认证失败。请把下面公钥加到 GitHub → Settings → SSH and GPG keys:"
  cat ~/.ssh/id_ed25519.pub
  exit 1
fi

current=$(git remote get-url origin 2>/dev/null || true)
if [[ "${current}" == https://* ]]; then
  git remote set-url origin "${REPO}"
  echo "已将 origin 改为 SSH: ${REPO}"
fi

echo "==> git fetch / pull"
git fetch origin "${BRANCH}"
git merge --ff-only "origin/${BRANCH}" 2>/dev/null || git pull origin "${BRANCH}"

echo "完成。可执行: sudo bash deploy/deploy.sh"
