# BlueMapWebChat nginx HTTPS setup guide

This guide keeps BlueMap and BlueMapWebChat running as local HTTP services, then exposes them through nginx over HTTPS.

## Recommended layout

```text
User browser
  ↓ HTTPS
nginx :443
  ├─ /           -> BlueMap web server, usually 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API and standalone page, usually 127.0.0.1:8899
      /bmwc/api  -> internal /api
      /bmwc/chat -> internal /chat
```

The browser should use one public origin: `https://map.example.com/`, `https://map.example.com/bmwc/api/config`, and `https://map.example.com/bmwc/chat`.

## 1. Install nginx and Certbot

nginx does not issue certificates by itself. For a public HTTPS setup, install nginx and Certbot, then request a Let's Encrypt certificate for your domain.

### Debian / Ubuntu example

```bash
sudo apt update
sudo apt install -y nginx snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

Allow HTTP/HTTPS before issuing the certificate:

```bash
sudo ufw allow 'Nginx Full'
```

Issue and install a certificate with the nginx plugin:

```bash
sudo certbot --nginx -d map.example.com
```

For dry-run renewal testing:

```bash
sudo certbot renew --dry-run
```

If your distribution packages Certbot directly, `sudo apt install certbot python3-certbot-nginx` may also work, but the official Certbot instructions often prefer the snap package.

## 2. nginx server block example

Copy `examples/nginx/bluemapwebchat.conf` and change the domain and certificate paths.

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

The trailing slash in `proxy_pass http://127.0.0.1:8899/;` is intentional. It strips `/bmwc/` before forwarding, so `/bmwc/api/config` reaches the plugin as `/api/config` and `/bmwc/chat` reaches it as `/chat`.

`proxy_buffering off` is important for Server-Sent Events. Without it, chat updates or reconnect behavior may be delayed behind nginx buffering.

Apply it manually if you do not let Certbot edit nginx automatically:

```bash
sudo cp examples/nginx/bluemapwebchat.conf /etc/nginx/sites-available/bluemapwebchat.conf
sudo ln -sf /etc/nginx/sites-available/bluemapwebchat.conf /etc/nginx/sites-enabled/bluemapwebchat.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 3. BlueMapWebChat config.yml

Use this minimal HTTPS reverse-proxy override:

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
  # Optional. Same value as web-addon.api-base-url is valid.
  api-base-url: "/bmwc/api"

upload:
  # Recommended: keep empty. If needed, "/bmwc/api" or "/bmwc/api/uploads" also works.
  public-base-url: ""

emoji:
  # Recommended: keep empty. If needed, "/bmwc/api" or "/bmwc/api/emojis" also works.
  public-base-url: ""

ui:
  image-preview-max-height: 720
```

`map.example.com` must be replaced with your real domain.

Keep media preview max-height enabled for scroll stability. Recommended: `640-720`. `0` means unlimited and can cause scroll jumps in media-heavy virtual scrolling.

## 4. Firewall recommendation

```text
Allow from the internet: 80/tcp, 443/tcp
Block from the internet: 8100/tcp, 8899/tcp
```

When nginx and Minecraft run on the same host, bind the BlueMapWebChat API to `127.0.0.1`. If nginx runs on another host or inside a container, use the appropriate private address instead.

## 5. Apply order

1. Point the domain A/AAAA record to the server IP.
2. Allow `80/tcp` and `443/tcp` in the firewall.
3. Install nginx and Certbot.
4. Issue a certificate with `sudo certbot --nginx -d map.example.com` or install your certificate manually.
5. Apply the nginx config and confirm `sudo nginx -t` succeeds.
6. Set `web-addon.api-base-url` to `/bmwc/api`.
7. For `https://map.example.com/bmwc/chat`, `standalone-web.api-base-url` may be left empty or set to the same `/bmwc/api` value as `web-addon.api-base-url`.
8. Leave upload/emoji public URLs empty in normal deployments. For legacy explicit settings, `upload.public-base-url` may be `/bmwc/api` or `/bmwc/api/uploads`, and `emoji.public-base-url` may be `/bmwc/api` or `/bmwc/api/emojis`.
9. Run `/bmchat reload` or restart the server to regenerate the web addon file.
10. Run `/bluemap reload` if BlueMap does not refresh the web assets automatically.
11. Open `https://map.example.com/` or `https://map.example.com/bmwc/chat` in the browser.

## 6. HTTP page + HTTPS API warning

Serving the BlueMap page over HTTP while only the chat API uses HTTPS is not a complete security boundary. If the page or `chat.js` is delivered over HTTP, a network attacker could modify the script before it talks to the HTTPS API.

For public servers, serve both BlueMap and BlueMapWebChat under the same HTTPS origin.

### URL setting resolution

`web-addon.api-base-url` is the primary HTTPS public API path. Leave `standalone-web.api-base-url`, `upload.public-base-url`, and `emoji.public-base-url` empty unless you need a compatibility override. Empty standalone follows `web-addon.api-base-url`; empty upload/emoji append `/uploads` and `/emojis`. Absolute browser paths such as `/bmwc/api` are used as-is. Relative values without a leading `/` are resolved against `http.cors-origin` when it is a real origin. Full `https://...` URLs are used as-is.
