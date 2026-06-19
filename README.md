# BlueMapWebChat

A web chat plugin for Bukkit/Paper/Spigot-compatible Minecraft servers. It can run as a BlueMap web addon, as a standalone `/chat` page served by the plugin, or both at the same time.

<img width="1057" height="682" alt="Image" src="https://github.com/user-attachments/assets/722761ea-94a4-4da9-be79-3cd04997c166" />

## Features

- BlueMap embedded chat panel and standalone web chat page
- Two-way game ↔ web chat relay
- Guest chat with math captcha, cooldowns, and per-minute limits
- `/bmchat auth <code>` account linking, web password login, local admin accounts
- Web admin/moderator panel, message hiding, pin/delete action toggle, guest/IP mutes, session revoke
- File and clipboard upload, image/video/audio/YouTube previews
- DiscordSRV relay and Discord CDN media cache
- Pinned messages, virtual scrolling, draggable/resizable window, experimental PIP
- Built-in UI languages: en-US, ko-KR, ja-JP, zh-CN


## Media preview height and scroll stability

The recommended media preview max height is `640-720px`. The default is `ui.image-preview-max-height: 720`.

Keeping this limit enabled gives the best scroll stability with virtual scrolling. Setting the value to `0` means unlimited height, but very large or unlimited image/GIF/video/iframe previews can cause visible scroll jumps while media finishes loading, especially in long media-heavy chat histories.

```yaml
ui:
  image-preview-max-height: 720
```

## Build

```bash
mvn clean package
```

```text
target/BlueMapWebChat-3.0.0.jar
```

## Install

1. Put the jar into `plugins/`.
2. Start the server once to generate `plugins/BlueMapWebChat/config.yml`.
3. For BlueMap embedded mode, keep `web-addon.auto-install` and `web-addon.auto-patch-webapp-conf` enabled.
4. For standalone-only mode, set `standalone-web.enabled: true`, `web-addon.auto-install: false`, and `web-addon.auto-patch-webapp-conf: false`.
5. Restart the server or run `/bmchat reload`. Run `/bluemap reload` if BlueMap does not refresh web assets automatically.

## Deployment modes

### BlueMap addon and standalone page together

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: true
  auto-patch-webapp-conf: true
```

### Standalone only

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```

Standalone URL:

```text
http://<server-host>:8899/chat
```

## HTTPS / reverse proxy recommended setup

For public servers, keep BlueMap and BlueMapWebChat as internal HTTP services and expose them through HTTPS.

```yaml
http:
  host: "127.0.0.1"
  port: 8899
  path-prefix: "/api"
  cors-origin: "https://map.example.com"

standalone-web:
  enabled: true
  path: "/chat"
  api-base-url: "/bmwc/api"

web-addon:
  api-base-url: "/bmwc/api"

upload:
  public-base-url: "/bmwc/api/uploads"
```

Example paths:

```text
https://map.example.com/          # BlueMap
https://map.example.com/bmwc/api  # BlueMapWebChat API
https://map.example.com/bmwc/chat # standalone chat
```

See `docs/CADDY_HTTPS_EN.md` for Caddy or `docs/NGINX_HTTPS_EN.md` for nginx.

## Common options

- `ui.language`: default UI language. `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `ui.image-preview-max-height`: recommended `640-720`; `0` means unlimited and may cause scroll jumps with media-heavy virtual scrolling
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: when `false`, Minecraft legacy colors are rendered for actual chat sender names. System/event lines are always stripped.
- `commands.enabled`: enable the web command panel
- `commands.allow-all`: allow arbitrary console commands instead of presets only
- `commands.run-from-chat-input`: allow `/command` execution from the normal chat input
- `ui.picture-in-picture.enabled`: controls both the PIP button and PIP execution

## Commands

```text
/bmchat auth <code>
/bmchat password <newPassword>
/bmchat reload
/bmchat admin create <id>
/bmchat admin password <id> <password>
/bmchat admin role <id> <user|moderator|admin>
/bmchat guest mute <guest|ip> <value> [minutes] [reason]
/bmchat guest unmute <guest|ip> <value>
/bmchat guest list
/bmchat sessions
/bmchat revoke <username>
```

## Permissions

```text
bluemapwebchat.auth
bluemapwebchat.webchat
bluemapwebchat.admin
```

## Documentation

- `docs/CONFIGURATION_EN.md` - configuration reference
- `docs/CADDY_HTTPS_EN.md` - HTTPS reverse proxy setup with Caddy
- `docs/NGINX_HTTPS_EN.md` - HTTPS reverse proxy setup with nginx
- `docs/I18N_EN.md` - language files and fallback behavior
- `docs/INSTALL_TROUBLESHOOTING_EN.md` - install, upgrade, troubleshooting
- `docs/UPLOAD_SECURITY_EN.md` - upload security notes
- `docs/RELEASE_CHECKLIST_EN.md` - release checklist
- `docs/STANDALONE_REVIEW_EN.md` - BlueMap dependency and standalone mode review
- `docs/OPERATIONS_SECURITY_EN.md` - public deployment, trusted proxy logs, and security checklist

## Security note

HTTP-only mode is supported for private/testing use. Passwords are stored hashed on the server, but HTTP login traffic is not encrypted. Use HTTPS for public servers.

Font note: Installed fonts must be typed by their CSS font-family name. Chat settings include a Test button that estimates whether the typed name is available in the current browser without requesting local-font permissions.
Chat settings also separate message text color from UI text/glyph color. The UI color covers role labels, Web/Game source labels, timestamps, placeholders, upload/command buttons, and pinned labels.
Folded pinned-message text follows the configured chat font and message font size. Built-in system messages such as server announcements and web command results are translated by language files when an i18n key is available.
