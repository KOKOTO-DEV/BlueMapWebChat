# BlueMapWebChat Caddy HTTPS setup guide

This guide keeps BlueMap and BlueMapWebChat running as local HTTP services, then exposes them through Caddy over HTTPS.

## Recommended layout

```text
User browser
  ↓ HTTPS
Caddy :443
  ├─ /           -> BlueMap web server, usually 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API and standalone page, usually 127.0.0.1:8899
      /bmwc/api  -> internal /api
      /bmwc/chat -> internal /chat
```

The browser should use one public origin:

```text
https://map.example.com/
https://map.example.com/bmwc/api/config
https://map.example.com/bmwc/chat
```

The internal services can stay on their original HTTP ports.

## 1. Install Caddy

Caddy usually obtains and renews Let's Encrypt certificates automatically when the domain points to the server and ports `80/tcp` and `443/tcp` are reachable.

### Debian / Ubuntu example

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### Fedora / RHEL-family example

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install -y caddy
```

### Arch Linux example

```bash
sudo pacman -S caddy
```

## 2. Caddyfile example

Copy `examples/caddy/Caddyfile` and change the domain.

```caddyfile
map.example.com {
  encode zstd gzip

  handle_path /bmwc/* {
    reverse_proxy 127.0.0.1:8899
  }

  handle {
    reverse_proxy 127.0.0.1:8100
  }
}
```

`handle_path /bmwc/*` strips `/bmwc`, so `/bmwc/api/config` is forwarded to the plugin as `/api/config`, and `/bmwc/chat` is forwarded as `/chat`.

Apply it:

```bash
sudo cp examples/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 3. BlueMapWebChat config.yml

Use this minimal HTTPS reverse-proxy override:

```yaml
http:
  host: "127.0.0.1"
  port: 8899
  path-prefix: "/api"
  cors-origin: "https://map.example.com"

standalone-web:
  enabled: true
  path: "/chat"
  # Optional. Same value as web-addon.api-base-url is valid.
  api-base-url: "/bmwc/api"

web-addon:
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

Replace `map.example.com` with your real domain.

Keep media preview max-height enabled for scroll stability. Recommended: `640-720`. `0` means unlimited and can cause scroll jumps in media-heavy virtual scrolling.

## 4. BlueMap

BlueMap may keep using its existing web port, commonly `8100`. For public deployments, expose only Caddy's `80/tcp` and `443/tcp` ports to the internet and keep BlueMap and BlueMapWebChat internal.

## 5. Firewall recommendation

```text
Allow from internet: 80/tcp, 443/tcp
Block from internet: 8100/tcp, 8899/tcp
```

Internally, Caddy connects to `127.0.0.1:8100` and `127.0.0.1:8899`.

## 6. Apply order

1. Point your domain A/AAAA record to the server IP.
2. Allow `80/tcp` and `443/tcp` in the firewall.
3. Install Caddy.
4. Copy and reload the Caddyfile.
5. Set `web-addon.api-base-url` to `/bmwc/api`.
6. For `https://map.example.com/bmwc/chat`, `standalone-web.api-base-url` may be left empty or set to the same `/bmwc/api` value as `web-addon.api-base-url`.
7. Leave `upload.public-base-url` and `emoji.public-base-url` empty unless you intentionally serve them from a separate public path. Legacy explicit values such as `/bmwc/api/uploads` and `/bmwc/api/emojis` are also accepted.
8. Run `/bmchat reload` or restart the server so the web addon files are regenerated.
9. Run `/bluemap reload` if BlueMap does not reload web assets automatically.
10. Open `https://map.example.com/` or `https://map.example.com/bmwc/chat` in the browser.

## 7. HTTP page + HTTPS API warning

Serving the BlueMap page over HTTP while only the chat API uses HTTPS is technically possible, but it is not a complete security boundary. If the page or `chat.js` is delivered over HTTP, a network attacker could modify the script before it talks to the HTTPS API.

For public servers, serve both BlueMap and BlueMapWebChat under the same HTTPS origin.

## nginx alternative

If you use nginx instead of Caddy, see `docs/NGINX_HTTPS_EN.md` and `examples/nginx/bluemapwebchat.conf`.

### URL setting resolution

`web-addon.api-base-url` is the primary HTTPS public API path. Leave `standalone-web.api-base-url`, `upload.public-base-url`, and `emoji.public-base-url` empty unless you need a compatibility override. Empty standalone follows `web-addon.api-base-url`; empty upload/emoji append `/uploads` and `/emojis`. Absolute browser paths such as `/bmwc/api` are used as-is. Relative values without a leading `/` are resolved against `http.cors-origin` when it is a real origin. Full `https://...` URLs are used as-is.
