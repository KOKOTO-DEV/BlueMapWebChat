# BlueMapWebChat configuration reference

This document describes `plugins/BlueMapWebChat/config.yml`.

## Deployment modes

### BlueMap addon

```yaml
web-addon:
  auto-install: true
  auto-patch-webapp-conf: true
```

Installs assets under `addons/bluemap-web-chat` and patches BlueMap `webapp.conf`.

### Standalone only

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```

Open `http://<server-host>:8899/chat`.

### HTTPS reverse proxy

```yaml
http:
  host: "127.0.0.1"
  port: 8899
  path-prefix: "/api"
  cors-origin: "https://map.example.com"

standalone-web:
  enabled: true
  api-base-url: "/bmwc/api"

web-addon:
  api-base-url: "/bmwc/api"

upload:
  public-base-url: "/bmwc/api/uploads"
```


## UI time zone

`ui.time-zone` controls the time zone used for chat timestamps. Use `local` for the browser/device time zone, `UTC`, or an IANA time zone such as `Asia/Seoul`. Invalid values fall back to local time in the web UI.

## Options where 0 means unlimited/no maximum

- `chat.history-size`
- `chat.history-retention-days`
- `chat.history-persist-retention-days`
- `chat.history-page-size`
- `chat.max-message-length`
- `chat.max-url-message-length`
- `upload.max-uploads-per-minute`
- `upload.max-file-size-mb`
- `upload.max-files-per-message`
- `ui.image-preview-max-per-message`
- `ui.image-preview-max-height`
- `ui.max-width`
- `ui.max-height`
- `preview.youtube-max-embeds-per-message`
- `preview.external-media-cache-max-size-mb`
- `pinned.max-pins`
- `pinned.show-to-logged-out`
- `commands.max-length`

## Pinned messages

`pinned.show-to-logged-out` controls whether pinned messages are shown before web login. Set it to `false` when pinned content should only be visible to logged-in users.

## Pin/delete action toggle

Per-message pin/delete buttons are hidden by default to avoid accidental clicks. ADMIN/MOD users can open the admin panel and use the pin/delete action toggle next to the web-history clear button. The toggle is not persisted and resets to off after refresh.

## UI

```yaml
ui:
  language: "en-US"        # en-US, ko-KR, ja-JP, zh-CN
  language-fallback: "en-US"
  theme: "system"          # system, dark, light, high-contrast
  opacity: 0.92
```

Per-browser user settings are stored in localStorage.

`ui.text-color` sets the default chat message text color. `ui.ui-text-color` sets the default UI text/glyph color used by role labels, source labels, timestamps, placeholders, upload/command buttons, pinned labels, and similar chrome. Leave them empty to follow the selected theme. Users can override both per browser in Chat settings.

```yaml
ui:
  text-color: ""          # theme default for message body
  ui-text-color: ""       # theme default for UI labels/glyphs
  # text-color: "#f4f4f4"
  # ui-text-color: "#b8d8ff"
```

`ui.input-background-color` can override the input field background globally. Leave it empty to follow the selected theme. Users can also override it per browser in Chat settings.

```yaml
ui:
  input-background-color: ""      # theme default
  # input-background-color: "#1e1e24"
```

## Player names

```yaml
player-display:
  mode: "name"             # name, display-name, custom-name
  strip-colors: true
```

When `strip-colors: false`, Minecraft legacy color codes are rendered only for actual chat sender names. System/event messages such as join/quit/death/advancement always strip color codes.

## Command panel

```yaml
commands:
  enabled: false
  allow-all: false
  min-role: ADMIN
  run-from-chat-input: false
  max-length: 0
```

`allow-all: true` lets the web UI run arbitrary console commands, so use it only with HTTPS and strong authentication. When `run-from-chat-input: false`, commands run only from the command button/modal.

## Media preview height and scroll stability

`ui.image-preview-max-height` limits the displayed height of image, GIF, video, and iframe-style previews. The recommended range is `640-720`; the default is `720`.

```yaml
ui:
  image-preview-max-height: 720
```

Set it to `0` only when unlimited preview height is acceptable. Unlimited or very large media previews can cause visible scroll jumps while media finishes loading, especially with virtual scrolling and long media-heavy histories.

## Previews

```yaml
preview:
  youtube-click-to-load: true
  media-click-to-load: true
```

Set these to `false` to render iframe/player previews immediately. Autoplay is still controlled by browser policy.

## PIP

```yaml
ui:
  picture-in-picture:
    enabled: false
```

This single flag controls both the PIP button and PIP execution. Browser URL/close UI, OS-level window transparency, and the outer PIP window movement are controlled by the browser/OS, not by the chat settings title.

## Login failure limit

`security.login-fail-limit`, `security.login-fail-window-seconds`, and `security.login-lock-seconds` protect password login from repeated failures. Set `login-fail-limit: 0` to disable the limit. This change only affects web password login.
## Link code rate limit

`auth.link-code-cooldown-seconds` and `auth.link-code-max-per-minute` limit how often the web UI may issue `/bmchat auth <code>` link codes per remote IP. Set either value to `0` to disable that part of the limit.

## HTTP proxy / client IP

`http.trusted-proxies` controls whether `X-Forwarded-For` is trusted. Keep it empty for direct HTTP. When using Caddy/Nginx on the same host, add `127.0.0.1` and `::1` as block-style YAML list entries. Set `http.log-client-ip-resolution: true` only temporarily to confirm the socket IP, forwarded header, and resolved client IP in the server console and `logs/latest.log`. See `docs/OPERATIONS_SECURITY_EN.md` for the full check procedure.

## SSE connection limits

`security.max-sse-connections-per-ip` and `security.max-sse-connections-total` limit long-lived `/stream` connections. `0` disables each limit.


### System message translation

Built-in announcements and web command result messages include i18n keys. Keep `announcements.*.message` as the fallback/custom text; viewers will see the translated language-file text when the key exists.

Collapsed pinned-message bar text follows the configured chat font and message font size.

### Text shadow / readability

- `ui.text-shadow-mode`: `none`, `auto`, `dark`, `light`, or `custom`. Use this to keep text readable when custom text/background colors have low contrast.
- `ui.text-shadow-custom`: CSS `text-shadow` value used when the mode is `custom`. In the chat settings UI, this is edited with a color picker and sliders for X offset, Y offset, blur, and opacity; the stored value remains standard CSS, for example `0 1px 2px rgba(0, 0, 0, 0.85)`.

> The theme can also be changed per browser from Chat settings. Changing the theme resets visual settings such as text colors, background colors, and shadows to that theme's defaults.
