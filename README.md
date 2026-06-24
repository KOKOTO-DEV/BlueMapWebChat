# BlueMapWebChat

A web chat plugin for Bukkit/Paper/Spigot-compatible Minecraft servers. It can run as a BlueMap web addon, as a standalone `/chat` page served by the plugin, or both at the same time.

## Features

- BlueMap embedded chat panel and standalone web chat page
- Two-way game ↔ web chat relay
- Guest chat with math captcha, cooldowns, and per-minute limits
- `/bmchat auth <code>` account linking, web password login, local admin accounts
- Web admin/moderator panel, message hiding, pin/delete action toggle, guest/IP mutes, session revoke
- Admin custom emoji manager: create, upload, rename, and delete emoji folders/files
- File and clipboard upload, image/video/audio/YouTube/Shorts previews, plus optional TikTok and X/Twitter embeds
- DiscordSRV relay and Discord CDN media cache
- Message replies with clickable referenced-message previews, pinned messages, virtual scrolling, draggable/resizable window, experimental PIP
- Built-in UI languages: en-US, ko-KR, ja-JP, zh-CN

## Build

```bash
mvn clean package
```

```text
target/BlueMapWebChat-4.0.0.jar
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

## HTTPS / Caddy recommended setup

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
  # Optional. This may be the same route as web-addon.api-base-url.
  api-base-url: "/bmwc/api"

web-addon:
  api-base-url: "/bmwc/api"

upload:
  # Recommended: keep empty so uploads follow /bmwc/api automatically.
  # Legacy explicit forms also work: "/bmwc/api" or "/bmwc/api/uploads".
  public-base-url: ""

emoji:
  # Recommended: keep empty so emoji files follow /bmwc/api automatically.
  # Legacy explicit forms also work: "/bmwc/api" or "/bmwc/api/emojis".
  public-base-url: ""
  max-total-size-mb: 64
  show-storage-usage: true
  show-storage-limit: true
```

Example paths:

```text
https://map.example.com/          # BlueMap
https://map.example.com/bmwc/api  # BlueMapWebChat API
https://map.example.com/bmwc/chat # standalone chat
```


URL settings note: in HTTPS reverse proxy mode, set `web-addon.api-base-url` to the public API path such as `/bmwc/api`. `standalone-web.api-base-url`, `upload.public-base-url`, and `emoji.public-base-url` usually stay empty. When empty, standalone reuses the web-addon API base, and uploads/emojis append `/uploads` and `/emojis` automatically. Legacy explicit values such as `/bmwc/api`, `/bmwc/api/uploads`, and `/bmwc/api/emojis` are also accepted. Relative values without a leading `/` are resolved against `http.cors-origin` when it is a real origin.

See `docs/CADDY_HTTPS_EN.md` for details.

## Common options

- `ui.language`: default UI language. `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: when `false`, Minecraft legacy colors are rendered for actual chat sender names. System/event lines are always stripped.
- `commands.enabled`: enable the web command panel
- `commands.allow-all`: allow arbitrary console commands instead of presets only
- `commands.run-from-chat-input`: allow `/command` execution from the normal chat input
- `ui.picture-in-picture.enabled`: controls both the PIP button and PIP execution

## Custom emoji and ImageEmojis

BlueMapWebChat stores custom emoji files under `plugins/BlueMapWebChat/emojis`. Subfolders are treated as emoji packs.

When `emoji.game-link.mode` is set to `imageemojis` or `imageemojis-link`, GIF/JPG/JPEG/WEBP emoji originals automatically get same-folder PNG sidecars for ImageEmojis. For example, uploading `wave.gif` to the `default` pack stores:

```text
plugins/BlueMapWebChat/emojis/default/wave.gif
plugins/BlueMapWebChat/emojis/default/wave.png
```

The web UI keeps using the original file, so GIF animation is preserved. ImageEmojis can load the PNG sidecar. If ImageEmojis watches the same emoji directory, run `/emojis reload` after adding or changing emoji files.

## YouTube Shorts, TikTok, and X/Twitter previews

YouTube Shorts URLs are handled by the normal YouTube preview, use a vertical player, and are enabled by default. TikTok and X/Twitter embeds are available as optional social embeds and are disabled by default because they load third-party content. TikTok uses the official `player/v1` iframe with long description/music text hidden in the chat panel; users can open the original TikTok link for full details.

```yaml
preview:
  youtube-embed-enabled: true
  social-embeds:
    enabled: true
    click-to-load: true
    max-embeds-per-message: 2
    tiktok:
      enabled: false
    x:
      enabled: false
```

Enable TikTok or X/Twitter only if you are comfortable with third-party embed requests from users' browsers. Keep `click-to-load: true` for public servers so third-party content loads only after a user opens a preview.

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
- `docs/CADDY_HTTPS_EN.md` - HTTPS reverse proxy setup
- `docs/I18N_EN.md` - language files and fallback behavior
- `docs/INSTALL_TROUBLESHOOTING_EN.md` - install, upgrade, troubleshooting
- `docs/UPLOAD_SECURITY_EN.md` - upload security notes
- `docs/RELEASE_CHECKLIST_EN.md` - release checklist
- `docs/STANDALONE_REVIEW_EN.md` - BlueMap dependency and standalone mode review
- `docs/OPERATIONS_SECURITY_EN.md` - public deployment, trusted proxy logs, and security checklist

## Security note

HTTP-only mode is supported for private/testing use. Passwords are stored hashed on the server, but HTTP login traffic is not encrypted. Use HTTPS for public servers.

Font note: Installed fonts must be typed by their CSS font-family name. Chat settings include a Test button that estimates whether the typed name is available in the current browser without requesting local-font permissions.
