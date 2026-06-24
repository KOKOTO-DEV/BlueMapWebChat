# BlueMapWebChat Caddy HTTPS 配置指南

本指南说明如何让 BlueMap 和 BlueMapWebChat 继续作为本地 HTTP 服务运行，并通过 Caddy 以 HTTPS 对外提供服务。

## 推荐结构

```text
用户浏览器
  ↓ HTTPS
Caddy :443
  ├─ /           -> BlueMap Web 服务器，通常为 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API 和独立页面，通常为 127.0.0.1:8899
      /bmwc/api  -> 内部 /api
      /bmwc/chat -> 内部 /chat
```

浏览器应使用同一个公开 origin。

```text
https://map.example.com/
https://map.example.com/bmwc/api/config
https://map.example.com/bmwc/chat
```

## 1. 安装 Caddy

当域名已指向服务器，并且 `80/tcp`、`443/tcp` 可访问时，Caddy 通常会自动申请并续期 Let's Encrypt 证书。

### Debian / Ubuntu 示例

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

### Fedora / RHEL 系示例

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install -y caddy
```

### Arch Linux 示例

```bash
sudo pacman -S caddy
```

## 2. Caddyfile 示例

复制 `examples/caddy/Caddyfile`，并替换域名。

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

`handle_path /bmwc/*` 会去掉 `/bmwc` 前缀，因此 `/bmwc/api/config` 会转发为插件内部的 `/api/config`，`/bmwc/chat` 会转发为 `/chat`。

应用示例:

```bash
sudo cp examples/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 3. BlueMapWebChat config.yml

```yaml
http:
  host: "127.0.0.1"
  port: 8899
  path-prefix: "/api"
  cors-origin: "https://map.example.com"

standalone-web:
  enabled: true
  path: "/chat"
  # 可选。可以与 web-addon.api-base-url 使用相同值。
  api-base-url: "/bmwc/api"

web-addon:
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

如果 Caddy 和 Minecraft 在同一台主机上，建议将 BlueMapWebChat API 只绑定到 `127.0.0.1`。

## 5. 应用步骤

1. 将域名 A/AAAA 记录指向服务器 IP。
2. 在防火墙中允许 `80/tcp` 和 `443/tcp`。
3. 安装 Caddy。
4. 放置 Caddyfile 并 reload Caddy。
5. 将 `web-addon.api-base-url` 设为 `/bmwc/api`。
6. 通过 `https://map.example.com/bmwc/chat` 打开独立页面时，`standalone-web.api-base-url` 可以留空，也可以设置为与 `web-addon.api-base-url` 相同的 `/bmwc/api`。
7. 上传/表情公开 URL 通常留空。如需旧式显式配置，`upload.public-base-url` 可使用 `/bmwc/api` 或 `/bmwc/api/uploads`，`emoji.public-base-url` 可使用 `/bmwc/api` 或 `/bmwc/api/emojis`。
8. 执行 `/bmchat reload` 或重启服务器以重新生成 Web addon 文件。
9. 如果 BlueMap 未自动刷新 Web 资源，请执行 `/bluemap reload`。
10. 在浏览器中打开 `https://map.example.com/` 或 `https://map.example.com/bmwc/chat`。

## 6. HTTP 页面 + HTTPS API 注意事项

只让聊天 API 使用 HTTPS，而 BlueMap 页面仍通过 HTTP 提供，并不是完整的安全边界。公开服务器应将 BlueMap 和 BlueMapWebChat 都放在同一个 HTTPS origin 下。

## nginx 替代方案

如果使用 nginx，请参考 `docs/NGINX_HTTPS_ZH_CN.md` 和 `examples/nginx/bluemapwebchat.conf`。

### URL 设置解析规则

`web-addon.api-base-url` 是 HTTPS 公开 API 路径的基准。除非需要兼容覆盖，`standalone-web.api-base-url`、`upload.public-base-url`、`emoji.public-base-url` 通常留空。standalone 留空会使用 `web-addon.api-base-url`；upload/emoji 留空会分别追加 `/uploads` 和 `/emojis`。`/bmwc/api` 这类绝对浏览器路径会原样使用。不带前导 `/` 的相对值会在 `http.cors-origin` 为实际 origin 时基于该 origin 解析。完整 `https://...` URL 原样使用。
