# AgentShield 阿里云上线指南（agentshieldtop.xyz）

> 适用：**2核2G 轻量服务器**，且**已有其他业务**在跑。  
> 方案：AgentShield 独占域名 `agentshieldtop.xyz`，后端监听 **127.0.0.1:8001**（不占用 80/443），与现有站点 **nginx 多 server_name 并存**。

---

## 一、架构说明

```
用户浏览器
    ↓ HTTPS :443
nginx（已有 + 新增 agentshieldtop.xyz server 块）
    ├─ /          → /var/www/agentshield（前端静态）
    ├─ /api/*     → 127.0.0.1:8001（AgentShield 后端）
    └─ /health    → 127.0.0.1:8001

现有业务域名 → 原有 nginx 配置（不受影响）
```

**资源占用（约）**：后端 1 worker ~150MB，nginx 静态几乎可忽略，适合 2G 内存。

---

## 二、域名解析（阿里云 DNS）

登录 [阿里云域名控制台](https://dns.console.aliyun.com/) → `agentshieldtop.xyz` → 解析设置：

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| A | `@` | 你的轻量服务器公网 IP |
| A | `www` | 同上 |

等待 5–10 分钟生效。本地验证：

```bash
ping agentshieldtop.xyz
```

---

## 三、服务器防火墙 / 安全组

阿里云轻量 **防火墙** 放行：

- **80**（HTTP，申请证书 + 跳转 HTTPS）
- **443**（HTTPS）

**不要**对公网开放 8001（后端只绑 127.0.0.1）。

若现有业务已占用 80/443，**无需额外端口** —— 同一 nginx 按域名分流即可。

---

## 四、上传代码到服务器

在**本地**打包上传（或 git clone）：

```bash
# 本地
cd /path/to/wangan
tar czf agentshield.tgz agentshield --exclude=node_modules --exclude=.venv --exclude=frontend/dist

scp agentshield.tgz root@你的服务器IP:/tmp/
```

在**服务器**：

```bash
sudo mkdir -p /opt
sudo tar xzf /tmp/agentshield.tgz -C /opt
# 得到 /opt/agentshield
```

或使用 git：

```bash
sudo git clone <你的仓库> /opt/agentshield
```

---

## 五、配置生产环境

```bash
cd /opt/agentshield
sudo cp deploy/.env.production.example backend/.env
sudo nano backend/.env
```

**必改项**：

```bash
JWT_SECRET=$(openssl rand -hex 32)   # 写入 .env
```

确认：

```env
HOST=127.0.0.1
PORT=8001
CORS_ORIGINS=https://agentshieldtop.xyz,https://www.agentshieldtop.xyz
ALLOW_LAN=false
```

---

## 六、安装依赖（首次）

```bash
# Ubuntu / Debian 轻量镜像
sudo apt update
sudo apt install -y nginx python3-venv python3-pip rsync certbot python3-certbot-nginx

# Node.js 18+（仅构建前端需要）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 七、部署（一键脚本）

```bash
cd /opt/agentshield
sudo chmod +x deploy/deploy.sh
sudo bash deploy/deploy.sh
```

脚本会：安装 Python 依赖 → 构建前端 → 发布到 `/var/www/agentshield` → 注册 systemd → 更新 nginx。

检查后端：

```bash
curl -s http://127.0.0.1:8001/health | head
sudo systemctl status agentshield
```

---

## 八、nginx 与 SSL（与现有业务共存）

### 8.1 首次（仅 HTTP，用于申请证书）

```bash
sudo cp /opt/agentshield/deploy/nginx/agentshieldtop.xyz.initial.conf \
  /etc/nginx/sites-available/agentshieldtop.xyz.conf
sudo ln -sf /etc/nginx/sites-available/agentshieldtop.xyz.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

确认 **现有业务站点** 的 `nginx -t` 仍通过（多站点共存）。

### 8.2 申请 Let's Encrypt 免费证书

```bash
sudo mkdir -p /var/www/certbot
sudo certbot --nginx -d agentshieldtop.xyz -d www.agentshieldtop.xyz
```

按提示输入邮箱。成功后 certbot 会自动改 nginx 配置。

### 8.3 切换到完整 HTTPS 配置（可选优化）

若 certbot 未完全匹配，可手动替换：

```bash
sudo cp /opt/agentshield/deploy/nginx/agentshieldtop.xyz.conf \
  /etc/nginx/sites-available/agentshieldtop.xyz.conf
# 确认 ssl_certificate 路径与 certbot 一致
sudo nginx -t && sudo systemctl reload nginx
```

---

## 九、验证上线

1. 浏览器打开 **https://agentshieldtop.xyz**
2. 登录演示账号：`student01` / `student123`
3. 打开 **快速集成 → 在线试集成**，点「立即评估」
4. 健康检查：`https://agentshieldtop.xyz/health`

---

## 十、与现有业务的关系

| 项目 | 现有业务 | AgentShield |
|------|---------|---------------|
| 域名 | 原域名不变 | agentshieldtop.xyz |
| 端口 | 80/443 共用 nginx | 同上，按 server_name 分流 |
| 后端端口 | 原应用端口 | **仅本机 8001** |
| 进程 | 原有 systemd/docker | 新增 `agentshield.service` |

**若现有业务也占 8000**：AgentShield 用 **8001**，无冲突。

**若 nginx 主配置在 `/etc/nginx/conf.d/`** 而非 `sites-enabled`：

```bash
sudo cp deploy/nginx/agentshieldtop.xyz.initial.conf /etc/nginx/conf.d/agentshield.conf
```

---

## 十一、日常运维

```bash
# 更新代码后重新发布
cd /opt/agentshield && git pull   # 或重新上传
sudo bash deploy/deploy.sh

# 查看日志
sudo journalctl -u agentshield -f

# 重启
sudo systemctl restart agentshield
```

证书续期（certbot 自动任务，可手动测试）：

```bash
sudo certbot renew --dry-run
```

---

## 十二、答辩 / 用户访问话术

> 演示地址：**https://agentshieldtop.xyz**  
> 评委无需安装，浏览器登录即可体验；集成 API 为同源 `POST /api/shield/evaluate`。

---

## 十三、常见问题

**Q: 502 Bad Gateway**  
→ `systemctl status agentshield`，确认 8001 在监听：`ss -lntp | grep 8001`

**Q: 登录后 API 401**  
→ 检查 `.env` 中 `JWT_SECRET` 是否部署后改过（改过需清浏览器 localStorage）

**Q: CORS 报错**  
→ 确认 `CORS_ORIGINS` 含 `https://agentshieldtop.xyz`，且 `ALLOW_LAN=false`

**Q: 2G 内存吃紧**  
→ 保持 `workers 1`；不要在生产跑 `npm run dev`；现有业务与 AgentShield 同时高峰时可考虑 swap

**Q: 想把现有业务迁到子域名**  
→ 原域名 nginx 不动，仅新增 agentshield 的 server 块即可
