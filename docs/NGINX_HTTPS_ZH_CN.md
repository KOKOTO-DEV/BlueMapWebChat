# BlueMapWebChat nginx HTTPS 配置指南

本指南说明如何让 BlueMap 和 BlueMapWebChat 继续作为本地 HTTP 服务运行，并通过 nginx 以 HTTPS 对外提供服务。

## 推荐结构

```text
用户浏览器
  ↓ HTTPS
nginx :443
  ├─ /           -> BlueMap Web 服务器，通常为 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API 和独立页面，通常为 127.0.0.1:8899
      /bmwc/api  -> 内部 /api
      /bmwc/chat -> 内部 /chat
```

浏览器应使用同一个公开 origin，例如 `https://map.example.com/`、`https://map.example.com/bmwc/api/config`、`https://map.example.com/bmwc/chat`。

## 1. 安装 nginx 和 Certbot

nginx 不会自行签发证书。公开 HTTPS 配置通常需要安装 nginx 和 Certbot，然后为域名申请 Let's Encrypt 证书。

### Debian / Ubuntu 示例

```bash
sudo apt update
sudo apt install -y nginx snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

申请证书前允许 HTTP/HTTPS。

```bash
sudo ufw allow 'Nginx Full'
```

使用 nginx 插件申请并安装证书。

```bash
sudo certbot --nginx -d map.example.com
```

测试自动续期:

```bash
sudo certbot renew --dry-run
```

某些发行版也可以使用 `sudo apt install certbot python3-certbot-nginx`，但 Certbot 官方说明通常优先推荐 snap 方式。

## 2. nginx 配置示例

复制 `examples/nginx/bluemapwebchat.conf`，并替换域名和证书路径。

```nginx
server {
    listen 80;
    server_name map.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name map.example.com;

    ssl_certificate     /etc/letsencrypt/live/map.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/map.example.com/privkey.pem;

    location /bmwc/ {
        proxy_pass http://127.0.0.1:8899/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
    }

    location / {
        proxy_pass http://127.0.0.1:8100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

`proxy_pass http://127.0.0.1:8899/;` 末尾的斜杠是有意设置的。它会去掉 `/bmwc/` 前缀，使 `/bmwc/api/config` 转发为 `/api/config`，`/bmwc/chat` 转发为 `/chat`。

`proxy_buffering off` 对 SSE(Server-Sent Events) 很重要。没有它时，聊天更新或重连可能会被 nginx 缓冲而延迟。

如果不让 Certbot 自动修改 nginx，而是手动管理 server block:

```bash
sudo cp examples/nginx/bluemapwebchat.conf /etc/nginx/sites-available/bluemapwebchat.conf
sudo ln -sf /etc/nginx/sites-available/bluemapwebchat.conf /etc/nginx/sites-enabled/bluemapwebchat.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 3. BlueMapWebChat config.yml

```yaml
http:
  host: "127.0.0.1"
  port: 8899
  path-prefix: "/api"
  cors-origin: "https://map.example.com"

web-addon:
  api-base-url: "/bmwc/api"


standalone-web:
  enabled: true
  path: "/chat"
  # 可选。可以与 web-addon.api-base-url 使用相同值。
  api-base-url: "/bmwc/api"

upload:
  # 推荐留空。需要时也可使用 "/bmwc/api" 或 "/bmwc/api/uploads"。
  public-base-url: ""

emoji:
  # 推荐留空。需要时也可使用 "/bmwc/api" 或 "/bmwc/api/emojis"。
  public-base-url: ""

ui:
  image-preview-max-height: 720
```

请将 `map.example.com` 替换为实际域名。

为了保持滚动稳定，建议保留媒体预览 max-height 限制。推荐值为 `640-720`。`0` 表示无限制，在媒体较多的 virtual scroll 场景中可能导致滚动跳动。

## 4. 防火墙建议

```text
允许从互联网访问: 80/tcp, 443/tcp
阻止从互联网访问: 8100/tcp, 8899/tcp
```

如果 nginx 和 Minecraft 在同一台主机上，建议将 BlueMapWebChat API 只绑定到 `127.0.0.1`。

## 5. 应用步骤

1. 将域名 A/AAAA 记录指向服务器 IP。
2. 在防火墙中允许 `80/tcp` 和 `443/tcp`。
3. 安装 nginx 和 Certbot。
4. 使用 `sudo certbot --nginx -d map.example.com` 申请证书，或手动放置证书。
5. 应用 nginx 配置并确认 `sudo nginx -t` 成功。
6. 将 `web-addon.api-base-url` 设为 `/bmwc/api`。
7. 通过 `https://map.example.com/bmwc/chat` 打开独立页面时，`standalone-web.api-base-url` 可以留空，也可以设置为与 `web-addon.api-base-url` 相同的 `/bmwc/api`。
8. 上传/表情公开 URL 通常留空。如需旧式显式配置，`upload.public-base-url` 可使用 `/bmwc/api` 或 `/bmwc/api/uploads`，`emoji.public-base-url` 可使用 `/bmwc/api` 或 `/bmwc/api/emojis`。
9. 执行 `/bmchat reload` 或重启服务器以重新生成 Web addon 文件。
10. 如果 BlueMap 未自动刷新 Web 资源，请执行 `/bluemap reload`。
11. 在浏览器中打开 `https://map.example.com/` 或 `https://map.example.com/bmwc/chat`。

## 6. HTTP 页面 + HTTPS API 注意事项

只让聊天 API 使用 HTTPS，而 BlueMap 页面仍通过 HTTP 提供，并不是完整的安全边界。公开服务器应将 BlueMap 和 BlueMapWebChat 都放在同一个 HTTPS origin 下。

### URL 设置解析规则

`web-addon.api-base-url` 是 HTTPS 公开 API 路径的基准。除非需要兼容覆盖，`standalone-web.api-base-url`、`upload.public-base-url`、`emoji.public-base-url` 通常留空。standalone 留空会使用 `web-addon.api-base-url`；upload/emoji 留空会分别追加 `/uploads` 和 `/emojis`。`/bmwc/api` 这类绝对浏览器路径会原样使用。不带前导 `/` 的相对值会在 `http.cors-origin` 为实际 origin 时基于该 origin 解析。完整 `https://...` URL 原样使用。
