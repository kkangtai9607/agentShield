# AgentShield 服务器私有部署备忘（本地副本，勿提交 Git）

> 复制本文件为 `DEPLOY-SERVER.local.md`（已在 .gitignore），填入你的真实 IP、账号等信息。

## 服务器

- 公网 IP：`YOUR_SERVER_IP`
- 路径：`/opt/agentshield`
- 后端端口：`8001`（127.0.0.1，nginx 反代）
- 域名：`agentshieldtop.xyz`

## DNS（阿里云）

| 类型 | 主机 | 值 |
|------|------|-----|
| A | @ | YOUR_SERVER_IP |
| A | www | YOUR_SERVER_IP |

## 首次部署

```bash
cd /opt/agentshield
cp deploy/.env.production.example backend/.env
# 编辑 backend/.env，设置 JWT_SECRET=$(openssl rand -hex 32)
sudo bash deploy/deploy.sh
sudo certbot --nginx -d agentshieldtop.xyz -d www.agentshieldtop.xyz
```

## 日常更新

```bash
cd /opt/agentshield
git pull
sudo bash deploy/deploy.sh
```
