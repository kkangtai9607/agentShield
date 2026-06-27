# 公网 IP + 端口访问 AgentShield（无域名 / 无备案场景）

适用：域名被 Beaver 备案拦截、certbot 失败，但需给评委演示。

## 访问地址

```text
http://114.215.209.144:8088
```

演示账号：`student01` / `student123`

## 一次性配置（在服务器执行）

### 1. 阿里云防火墙放行 8088

轻量应用服务器 → 防火墙 → 添加规则：**TCP 8088**

### 2. 安装 nginx 配置

```bash
sudo cp /opt/agentshield/deploy/nginx/agentshield-ip-8088.conf \
  /etc/nginx/sites-available/agentshield-ip-8088.conf
sudo ln -sf /etc/nginx/sites-available/agentshield-ip-8088.conf \
  /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. 修改 CORS（否则登录后 API 会失败）

编辑 `backend/.env`，在 `CORS_ORIGINS` 增加 IP 来源：

```env
CORS_ORIGINS=http://114.215.209.144:8088,https://agentshieldtop.xyz,https://www.agentshieldtop.xyz
```

或临时演示可设：

```env
ALLOW_LAN=true
```

并在 `CORS_ORIGINS` 加上 `http://114.215.209.144:8088`。

```bash
sudo systemctl restart agentshield
```

### 4. 验证

```bash
curl -s http://127.0.0.1:8088/health
curl -sI http://114.215.209.144:8088/
```

浏览器打开：**http://114.215.209.144:8088**

## 为何 netlab 能用 IP，AgentShield 不能？

| 项目 | netlab（示例） | AgentShield 生产配置 |
|------|----------------|----------------------|
| 后端监听 | 可能 `0.0.0.0:8000` | `127.0.0.1:8001`（仅本机） |
| 对外入口 | 直接端口或 nginx 域名 | 设计为 nginx 域名反代 |
| 域名访问 | 若已备案可正常 | 未备案 → Beaver 403 |

8088 方案：nginx 统一提供前端 + `/api`，与域名方案逻辑相同，只是换了个端口、不校验 server_name。

## 注意

- 不要用 `IP:8001` 访问（后端不对外监听）
- 正式答辩话术可写：演示地址 `http://114.215.209.144:8088`
- 域名备案完成后可继续用 `agentshieldtop.xyz`
