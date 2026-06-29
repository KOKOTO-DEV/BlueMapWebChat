# BlueMapWebChat configuration reference

This document describes `plugins/BlueMapWebChat/config.yml`.

## Master switch

New generated configs start with top-level `enabled: false`. In this state, BlueMapWebChat only creates/loads configuration and keeps only `/bmchat reload` available; it does not start web/chat services, listeners, Discord integration, private-message storage, addon installation, upload/emoji initialization, or cleanup tasks. Existing configs without this key are treated as enabled for upgrade compatibility. Review storage, retention, upload, preview, authentication, and exposure settings, then set `enabled: true`.

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
web-addon:
  auto-install: false
  auto-patch-webapp-conf: false

standalone-web:
  enabled: true
  path: "/chat"
```

Open `http://<server-host>:8899/chat`.

### HTTPS reverse proxy

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
  # Recommended: empty; follows web-addon.api-base-url.
  # You may also set the same public API route explicitly.
  api-base-url: ""

upload:
  # Recommended: keep empty so uploads follow the active API base.
  # Legacy explicit values also work: "/bmwc/api" or "/bmwc/api/uploads".
  public-base-url: ""

emoji:
  # Recommended: keep empty so emoji files follow the active API base.
  # Legacy explicit values also work: "/bmwc/api" or "/bmwc/api/emojis".
  public-base-url: ""
```

### Public URL option rules

- `http.path-prefix` is the plugin's internal HTTP API path. Normally leave the default `/api` unchanged.
- `web-addon.api-base-url` is the public API base used by the BlueMap embedded chat. In HTTPS reverse-proxy setups, this is usually `/bmwc/api`.
- `standalone-web.api-base-url` normally stays empty. When empty, standalone reuses `web-addon.api-base-url`; for example `/bmwc/chat` uses `/bmwc/api`. You may also explicitly set the same `/bmwc/api` value.
- `upload.public-base-url` normally stays empty. When empty, uploaded files use the active API base plus `/uploads`, for example `/bmwc/api/uploads`.
- `emoji.public-base-url` normally stays empty. When empty, custom emoji files use the active API base plus `/emojis`, for example `/bmwc/api/emojis`.
- Explicit legacy values are accepted. `/bmwc/api` appends `/uploads` or `/emojis` automatically, while `/bmwc/api/uploads` and `/bmwc/api/emojis` are used as-is.
- Relative values without a leading `/`, such as `bmwc/api`, `bmwc/api/uploads`, or `bmwc/api/emojis`, are resolved against `http.cors-origin` when it is a real origin. If `cors-origin` is `*`, they fall back to same-origin absolute paths such as `/bmwc/api...`.
- Full URLs such as `https://map.example.com/bmwc/api` are used as-is.

### Emoji storage display

`emoji.max-total-size-mb` limits total custom emoji storage. When the limit is exceeded, admin uploads show a localized warning instead of failing silently. `emoji.show-storage-usage` controls whether current emoji storage is shown in the admin emoji manager, and `emoji.show-storage-limit` controls whether the total limit is shown.

## Chat history storage

`chat.history-storage` controls the backend used for stored chat history. New configs use `sqlite`, which stores messages in `chat.history-sqlite-file` (`history.db` by default). SQLite is recommended for long-lived logs because before/after history pages, reply-jump lookup, deletion, and retention cleanup can use indexed queries.

Supported values:

- `sqlite`: persistent SQLite DB, recommended.
- `jsonl`: legacy single-file persistence using `chat.history-file`.
- `memory`: session-only in-memory history.

`chat.history-size` and `chat.history-retention-days` are shared by `memory`, `jsonl`, and `sqlite`. `0` means unlimited for each setting. New generated configs start with top-level `enabled: false`, so cleanup does not run until you review these values and set `enabled: true`. Use positive values such as `30` or `90` when your server policy requires automatic old-chat cleanup. Upload and external-media cache retention settings work the same way. `chat.history-file` is used only by JSONL; `chat.history-sqlite-file` is used only by SQLite. When `chat.history-sqlite-migrate-jsonl` is true, an empty SQLite DB imports `chat.history-file` once. Keep normal file backups of `history.db` before manual editing, large cleanup, or migration.

## Message search

`/history/search` and the in-chat search modal are available for message text and sender searches when stored history is enabled. The search options section can filter by date/time range, sender, source, and system/event inclusion. The search button is in the floating chat-panel area so the input row stays compact, and search results use a scrollable list with the configured chat theme/font settings. Search results can jump to the matching message using the existing history-around navigation. i18n-backed system/event messages are searched and displayed in the requested web UI language when possible. Search can be disabled with `search.enabled`, and the single `search.result-limit` setting controls both the web UI result count and the `/history/search` API limit. There is no separate internal maximum: setting it to 2000 returns up to 2000 results, while setting it to 10 returns up to 10. Very large values such as 10000 or 100000 are accepted, but they can slow searches, increase response size, and add significant CPU, memory, and database load. The default is 50, and 50-200 is recommended for normal use. Existing config files from older versions need these keys added manually or merged from the default config.


## Direct message threads

`direct-message.enabled` enables optional 1:1 direct-message threads. Targets are limited to linked/known players with stored UUID/name data. Threads are keyed by the sorted pair of UUIDs, so A->B and B->A always use the same conversation. Messages are stored in the independent private-message store configured by `direct-message.storage`. `auto` follows `chat.history-storage` when public chat uses `jsonl`; otherwise it uses SQLite. Use `direct-message.sqlite-file` for SQLite or `direct-message.jsonl-file` for JSONL.

`direct-message.retention-days: 0` means no time limit. Any positive value is shown next to the DM window title and physically deletes DM messages older than that many days. `direct-message.max-messages-per-thread: 0` disables count-based cleanup. `direct-message.confirm-hide` controls the web confirmation prompt before hiding a DM from your own view. Because private messages are stored on the server, the feature is disabled by default.

## UI time zone

`ui.time-zone` controls the time zone used for chat timestamps. Use `local` for the browser/device time zone, `UTC`, or an IANA time zone such as `Asia/Seoul`. Invalid values fall back to local time in the web UI.

## Options where 0 means unlimited/no maximum

- `chat.history-size`
- `chat.history-retention-days`
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
- `preview.social-embeds.max-embeds-per-message`
- `preview.external-media-cache-max-size-mb`
- `pinned.max-pins`
- `pinned.show-to-logged-out`
- `commands.max-length`
- `direct-message.retention-days`
- `direct-message.max-messages-per-thread`
- `direct-message.max-message-length`

## Guest chat controls

```yaml
guest:
  cooldown-seconds: 6
  max-messages-per-minute: 50
```

Guest chat is rate-limited by both `cooldown-seconds` and `max-messages-per-minute`. The default per-minute limit is `50` messages. Existing server configs are not overwritten automatically, so update `plugins/BlueMapWebChat/config.yml` manually if you want the new default on an existing installation.

## Reply relay to Minecraft chat

```yaml
reply:
  game-preview:
    enabled: true
    format: "&7{sender}: {preview}"
    max-length: 120

  game-prefix:
    enabled: true
    text: "↪ [Reply] "
```

When a web or guest message replies to another message, `game-preview.enabled` sends the referenced message preview as a separate Minecraft chat line before the actual web message. This keeps the normal web-to-game chat format unchanged while allowing URLs in both the quote line and the real message to remain clickable.

The preview text uses the same web-to-game custom emoji handling as normal web messages. With the default token-preserving setup, custom emoji tokens remain unchanged; when `emoji.game-link.enabled` is explicitly enabled, the selected game-link mode is applied. Long previews are shortened with `…` according to `max-length`; set it to `0` to disable preview-specific truncation.

`game-prefix` controls the actual reply message line label/prefix. With the default web formats it changes `[Web] Player: message` into `↪ [Reply] Player: message`. BlueMapWebChat replaces the first bracketed source label near the start of the already-rendered relay line; if no such label is found, the prefix text is prepended.

Both `game-preview.format` and `game-prefix.text` support Minecraft legacy color codes with `&`, for example `&7` for gray.

## Discord relay options

```yaml
discordsrv:
  append-web-emoji-links: false
  game-to-discord: false
  append-game-emoji-links: true
  max-emoji-links-per-message: 4
  reply-relay:
    enabled: false
    prefix-enabled: true
    preview-enabled: true
    preview-max-length: 120
```

`discordsrv.append-web-emoji-links` appends image URLs for BM Web Chat custom emoji tokens to web-to-Discord messages. `discordsrv.append-game-emoji-links` appends image URLs for game-side tokens by augmenting DiscordSRV's normal Minecraft→Discord relay messages when possible. Optional `discordsrv.game-to-discord` can make BM Web Chat send game chat to Discord directly, but keep it disabled when DiscordSRV already relays normal Minecraft chat to avoid duplicate Discord messages. These settings are separate from `emoji.game-link.*`, which only affects web-to-Minecraft chat.

`discordsrv.reply-relay` controls whether web reply previews are also sent to Discord. It is disabled by default to avoid extra/comment-like lines in Discord messages.

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

When `strip-colors: false`, Minecraft legacy color codes are rendered only for actual chat sender names in the web UI. System/event messages and Discord output strip raw Minecraft color codes. Stored/remembered display names are normalized against the current `strip-colors` setting when they are reused.

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
  youtube-embed-enabled: true
  youtube-click-to-load: true
  media-click-to-load: true
  youtube-nocookie: true
  youtube-remember-expanded: true
  youtube-autoplay-on-open: false
  youtube-max-embeds-per-message: 1

  social-embeds:
    enabled: true
    click-to-load: true
    max-embeds-per-message: 2
    tiktok:
      enabled: false
    x:
      enabled: false
      theme: "auto"
      dnt: true
      hide-media: false
      hide-thread: true
```

YouTube Shorts are handled by the normal YouTube preview path. Shorts are displayed in a vertical player and use YouTube loop parameters.

TikTok and X/Twitter are optional because they load third-party content in the viewer's browser. Keep them disabled unless your server policy allows third-party embeds. For public servers, keep `social-embeds.click-to-load: true` so the third-party player loads only after a user opens the preview.

TikTok uses the official `player/v1` iframe with `description=0` and `music_info=0`. This avoids variable-height captions creating inner scrollbars in the chat panel. The original TikTok link remains available below the player for the full post details.

Set `youtube-click-to-load` or `media-click-to-load` to `false` to render those previews immediately. Autoplay is still controlled by browser policy.

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


Admin custom emoji manager note: renaming an emoji file or folder changes the `:emoji:pack/name:` token. Existing chat messages that reference the old token may no longer render unless the old file/folder name is kept.


## Custom emoji and game-side emoji plugins

BlueMapWebChat stores custom emoji files under `plugins/BlueMapWebChat/emojis`. Subfolders are treated as emoji packs.

By default, `emoji.game-link.enabled` is `false`, so web-to-game messages preserve custom emoji tokens such as `:pack/name:` and `:emoji:pack/name:` unchanged. Use this default when ImageEmojis or another game-side emoji plugin renders tokens in Minecraft chat.

When `emoji.game-link.enabled` is `true`, `emoji.game-link.mode` supports `preserve`, `link`, and `label`.

- `preserve`: force token-preserving behavior even when game-link is enabled.
- `link`: sends `label-format` text plus a short BM Web Chat image link.
- `label`: sends `label-format` text only.

`emoji.game-link.*` only affects web-to-Minecraft chat. Discord image preview links are controlled separately by `discordsrv.append-web-emoji-links` for web→Discord and `discordsrv.append-game-emoji-links` for game→Discord. `append-game-emoji-links` can augment DiscordSRV's normal Minecraft→Discord relay messages, while `game-to-discord` is only needed when you want BM Web Chat to send game chat to Discord directly.

BM Web Chat does not call ImageEmojis or other game-side emoji plugins directly, and it does not read resource packs or generated glyphs. It preserves token text and attempts to load before ImageEmojis so original chat text can be captured before game-side rendering.

When token-preserving behavior is active and the same line also contains URLs, BM Web Chat keeps a single plain Minecraft chat line instead of repeating URL reference lines. This protects game-side emoji plugins that need to read the original token text.

`default-pack` and `aliases` help map flat game-side tokens back to BM Web Chat pack/name ids. For example:

```yaml
emoji:
  game-link:
    default-pack: "default"
    aliases:
      wave: "default/wave"
```

GIF/JPG/JPEG/WEBP emoji originals automatically get same-folder PNG sidecars for compatibility with game-side emoji plugins that only read PNG files. The web UI keeps using the original file, so GIF animation is preserved.
