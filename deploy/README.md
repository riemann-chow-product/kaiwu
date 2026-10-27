# 部署到生产（129.204.63.87）

> 目标：`https://your-domain.com` 打开作品集，HTTPS 自动续期，进程挂掉自动拉起。

## 0. 先确认一件事：备案（最容易踩的坑）

`129.204.63.87` 属于腾讯云网段。**如果这台机器在大陆地域（广州 / 上海 / 北京等）**，
域名要正式通过 80/443 访问，**必须先完成 ICP 备案**，否则会被运营商拦截，表现为「解析正常、但浏览器打不开」。
备案通常要 1–3 周，需要域名 + 腾讯云服务器。

**如果是香港 / 新加坡等海外地域**，则不需要备案，买完域名直接解析即可。

先确认地域，再往下走。

## 1. DNS 解析

在域名服务商处加两条 A 记录（备案通过后再加也行）：

| 主机记录 | 类型 | 记录值 | TTL |
| --- | --- | --- | --- |
| `@` | A | `129.204.63.87` | 600 |
| `www` | A | `129.204.63.87` | 600 |

验证：`dig +short your-domain.com` 应返回 `129.204.63.87`。

## 2. 安全组 / 防火墙

- 放行 **80** 和 **443**（对公网）。
- **不要**放行 `4310` —— 它只给本机反向代理用。
- 系统防火墙（如 ufw）：`ufw allow 80,443/tcp`。

## 3. 把代码放到服务器并构建

```bash
# 以 Ubuntu 为例，代码放 /opt/kaiwu
sudo mkdir -p /opt/kaiwu && sudo chown $USER /opt/kaiwu
# 用 git clone 或 rsync 把项目放进去
cd /opt/kaiwu
npm ci                 # 或 npm install
npm run build          # 生产构建，必须先跑
```

> 生产必须用 `npm run build && npm start`，**不要**用 `npm run dev`。

## 4. 环境变量（/opt/kaiwu/.env.production）

```ini
NODE_ENV=production
KAIWU_PUBLIC_URL=https://your-domain.com   # 关键：Agent Card / 徽章 / 导出的绝对链接靠它
KAIWU_SECRET=换成一串随机值                 # 会话签名密钥
KAIWU_SEED_TOKEN=换成一串随机值             # 批量导入鉴权
GITHUB_TOKEN=ghp_xxx                        # 强烈建议：否则 GitHub API 60 次/小时就限流
# LLM_API_KEY=sk-xxx                        # 可选：不配走本地启发式
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_MODEL=gpt-4o-mini
```

## 5. 反向代理 + HTTPS

二选一。**推荐 Caddy**（自动申请/续期证书，配置两行）。

### 方案 A：Caddy（最省事）

```bash
sudo apt install -y caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile   # 先把里面的 your-domain.com 换成你的域名
sudo systemctl reload caddy
```

### 方案 B：Nginx + certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/conf.d/kaiwu.conf  # 替换域名
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 6. 用 systemd 守护进程

```bash
sudo cp deploy/kaiwu.service /etc/systemd/system/kaiwu.service  # 替换域名与路径
sudo systemctl daemon-reload
sudo systemctl enable --now kaiwu
sudo systemctl status kaiwu
```

日志：`journalctl -u kaiwu -f`

## 7. 上线后自检

```bash
curl -I https://your-domain.com                       # 200
curl -s https://your-domain.com/.well-known/kaiwu.json # 公钥
npm run verify:card https://your-domain.com riemann    # ✓ 签名有效
```

## 注意事项（这个项目特有的）

- **必须单进程**：数据存在 `data/kaiwu.json`，用 `globalThis` 缓存。不要用 PM2 cluster / 多副本，
  否则并发写会互相覆盖。systemd 单 `ExecStart` 天然满足。
- **`data/` 要可写、要备份**：`kaiwu.json`、`secret.key`、`agent-key.json` 都在这里；
  换服务器时一起带走，否则 Agent Card 签名公钥会变。
- **给空间设口令**：现在空口令 = 公开后台。上线前在 `/studio` 或注册时设口令。
- **改了 `data/kaiwu.json` 必须重启进程**：内存缓存不会自动重读。
- 首次 `npm run build` 如果报内存不足，加 `NODE_OPTIONS=--max-old-space-size=2048`。
