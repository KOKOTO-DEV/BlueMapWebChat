# BlueMapWebChat 配置参考

本文说明 `plugins/BlueMapWebChat/config.yml`。

## 总开关

新生成的 config 顶层默认为 `enabled: false`。在此状态下，BlueMapWebChat 只会生成/读取配置，/bmchat reload 仍可使用，但不会启动 Web/聊天服务、监听器、Discord 集成、私信存储、插件网页安装、上传/表情初始化或清理任务。已有 config 如果没有此键，为了升级兼容会视为已启用。请先检查存储方式、保留期限、上传、预览、认证和对外公开设置，再改为 `enabled: true`。

## 部署模式

### BlueMap 插件模式

```yaml
web-addon:
  auto-install: true
  auto-patch-webapp-conf: true
```

将资源安装到 `addons/bluemap-web-chat`，并更新 BlueMap `webapp.conf`。

### 仅 standalone

```yaml
web-addon:
  auto-install: false
  auto-patch-webapp-conf: false

standalone-web:
  enabled: true
  path: "/chat"
```

访问 `http://<server-host>:8899/chat`。

### HTTPS 反向代理

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
  # 推荐留空。会跟随 web-addon.api-base-url。
  # 也可以显式设置同一个公开 API 路径，例如 "/bmwc/api"。
  api-base-url: ""

upload:
  # 推荐留空。上传 URL 会自动跟随当前 API base。
  # 旧式显式值也可用: "/bmwc/api" 或 "/bmwc/api/uploads"
  public-base-url: ""

emoji:
  # 推荐留空。表情 URL 会自动跟随当前 API base。
  # 旧式显式值也可用: "/bmwc/api" 或 "/bmwc/api/emojis"
  public-base-url: ""
```

### 公开 URL 选项规则

- `http.path-prefix` 是插件内部 HTTP API 路径。通常保持默认 `/api` 不变。
- `web-addon.api-base-url` 是 BlueMap 内嵌聊天使用的公开 API base。HTTPS 反向代理中通常设为 `/bmwc/api`。
- `standalone-web.api-base-url` 通常留空。留空时会复用 `web-addon.api-base-url`。例如 `/bmwc/chat` 会使用 `/bmwc/api`。需要时也可以显式设置同一个 `/bmwc/api`。
- `upload.public-base-url` 通常留空。留空时使用当前 API base 加 `/uploads`，例如 `/bmwc/api/uploads`。
- `emoji.public-base-url` 通常留空。留空时使用当前 API base 加 `/emojis`，例如 `/bmwc/api/emojis`。
- 也支持显式值。设置 `/bmwc/api` 时，upload 会自动追加 `/uploads`，emoji 会自动追加 `/emojis`；`/bmwc/api/uploads` 和 `/bmwc/api/emojis` 会原样使用。
- 不带前导 `/` 的相对值，例如 `bmwc/api`、`bmwc/api/uploads`、`bmwc/api/emojis`，会在 `http.cors-origin` 为实际 origin 时自动加上该 origin。若 `cors-origin: "*"`，则按同源绝对路径 `/bmwc/api...` 处理。
- `https://map.example.com/bmwc/api` 这样的完整 URL 会原样使用。

## 聊天记录存储

聊天记录通过 `chat.history-storage` 选择 `memory`、`jsonl` 或 `sqlite`。`chat.history-size` 和 `chat.history-retention-days` 在三种模式中共用。`0` 表示不限制数量/期限。新生成的 config 顶层默认为 `enabled: false`，因此在检查这些值并设置 `enabled: true` 前不会执行清理任务。如果服务器策略需要自动清理旧聊天，请设置正数保留天数，例如 `30` 或 `90`。上传和外部媒体缓存保留设置也按同样方式工作。`chat.history-file` 仅用于 JSONL，`chat.history-sqlite-file` 仅用于 SQLite。

## 1:1 私信会话线程

启用 `direct-message.enabled` 后，可以使用 1:1 会话线程式消息箱。目标仅限已有 UUID/名称记录的已关联或曾加入玩家。线程使用排序后的两个 UUID 作为键，因此 A→B 与 B→A 总是进入同一个会话。消息会保存到 `direct-message.storage` 指定的专用 DM 存储。`auto` 会在公开聊天使用 `jsonl` 存储时让 DM 也使用 JSONL，其他情况下使用 SQLite。SQLite 使用 `direct-message.sqlite-file`，JSONL 使用 `direct-message.jsonl-file`。

`direct-message.retention-days: 0` 表示无保留期限。大于 0 的值会显示在 DM 窗口标题旁作为保留期限，超过该天数的 DM 原文会被物理删除。`direct-message.max-messages-per-thread: 0` 表示不按线程消息数清理。`direct-message.confirm-hide` 控制 Web UI 在从自己视图隐藏 DM 前是否显示确认框。由于私信会保存在服务器上，此功能默认关闭。

## 0 表示无限制/无最大值的选项

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

## 访客聊天限制

```yaml
guest:
  cooldown-seconds: 6
  max-messages-per-minute: 50
```

访客聊天同时受 `cooldown-seconds` 和 `max-messages-per-minute` 限制。每分钟消息数默认值为 `50`。已有服务器的配置文件不会自动覆盖；如果要在现有安装中使用新的默认值，请手动更新 `plugins/BlueMapWebChat/config.yml`。

## Minecraft 聊天中的回复显示

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

当 Web 或访客消息回复另一条消息时，`game-preview.enabled` 会先在 Minecraft 聊天中单独发送一行被回复消息的预览，然后再发送实际 Web 消息。这样可以保持原有 Web→游戏聊天格式，同时让引用行和正文行中的 URL 都保持可点击。

预览文本会经过与普通 Web 消息相同的 Web→游戏自定义表情处理。使用默认 token 保留设置时，自定义表情 token 会保持不变；明确启用 `emoji.game-link.enabled` 时，会应用所选的 game-link mode。较长预览会按 `max-length` 使用 `…` 省略；设为 `0` 可关闭预览专用截断。

`game-prefix` 控制实际回复消息行的标签/prefix。使用默认 Web 格式时，它会把 `[Web] Player: message` 改为 `↪ [Reply] Player: message`。BlueMapWebChat 会替换已渲染 relay 行开头附近第一个方括号来源标签；如果找不到这样的标签，则会把 prefix 文本加到前面。

`game-preview.format` 和 `game-prefix.text` 都支持 `&7` 这类 Minecraft legacy 颜色代码。

## Discord 转发选项

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

`discordsrv.append-web-emoji-links` 会把 BM Web Chat 自定义表情 token 的图片 URL 附加到 Web→Discord 消息中。`discordsrv.append-game-emoji-links` 会在可能的情况下编辑 DiscordSRV 的普通 Minecraft→Discord 转发消息，为游戏侧 token 附加图片 URL。可选的 `discordsrv.game-to-discord` 是让 BM Web Chat 直接把游戏聊天发送到 Discord 的功能；如果 DiscordSRV 已经在转发普通 Minecraft 聊天，请保持关闭以避免重复消息。这些设置与只影响 Web→Minecraft 聊天的 `emoji.game-link.*` 分离。

`discordsrv.reply-relay` 控制是否也把 Web 回复预览发送到 Discord。默认关闭，以避免 Discord 消息出现类似额外评论的行。

## 置顶消息

`pinned.show-to-logged-out` 控制未登录访问者是否能看到置顶消息。如需仅登录用户可见，请设为 `false`。

## 固定/删除显示开关

为避免误点，单条消息上的固定/删除按钮默认隐藏。ADMIN/MOD 用户可以在管理面板中，使用“清空 Web 历史”按钮旁边的固定/删除开关来显示这些按钮。该开关不会持久保存，刷新后会恢复为关闭。

## UI

```yaml
ui:
  language: "en-US"        # en-US, ko-KR, ja-JP, zh-CN
  language-fallback: "en-US"
  theme: "system"          # system, dark, light, high-contrast
  opacity: 0.92
```

用户在浏览器中的显示设置保存在 localStorage。

## 玩家名称

```yaml
player-display:
  mode: "name"             # name, display-name, custom-name
  strip-colors: true
```

当 `strip-colors: false` 时，Web UI 只会为实际聊天发送者名称渲染 Minecraft legacy 颜色代码。系统/事件消息和 Discord 输出仍会移除原始 Minecraft 颜色代码。已保存的显示名在再次使用时也会按当前 `strip-colors` 设置进行规范化。

## 自定义表情与游戏侧表情插件

BlueMapWebChat 会把自定义表情文件保存到 `plugins/BlueMapWebChat/emojis`。子文件夹会作为表情包处理。

默认情况下，`emoji.game-link.enabled` 为 `false`，因此 Web→游戏消息会保留 `:pack/name:`、`:emoji:pack/name:` 这样的自定义表情 token。若 ImageEmojis 或其他游戏侧表情插件会在 Minecraft 聊天中渲染 token，请使用这个默认行为。

当 `emoji.game-link.enabled` 为 `true` 时，`emoji.game-link.mode` 支持 `preserve`、`link` 和 `label`。

- `preserve`: 即使 game-link 已启用，也强制保持 token 不变。
- `link`: 发送 `label-format` 文本，并附加一个短 BM Web Chat 图片链接。
- `label`: 只发送 `label-format` 文本。

`emoji.game-link.*` 只影响 Web→Minecraft 聊天。Discord 图片预览链接分别由 Web→Discord 的 `discordsrv.append-web-emoji-links` 和 Game→Discord 的 `discordsrv.append-game-emoji-links` 控制。`append-game-emoji-links` 会在可能的情况下编辑 DiscordSRV 的普通 Minecraft→Discord 转发消息；只有当你希望 BM Web Chat 直接发送游戏聊天到 Discord 时才需要 `game-to-discord`。

BM Web Chat 不会直接调用 ImageEmojis 或其他游戏侧表情插件，也不会读取资源包或生成的 glyph。它会保留 token 文本，并尽量在 ImageEmojis 之前加载，以便在游戏侧渲染前捕获原始聊天文本。

当 token 保留行为生效且同一行中也包含 URL 时，BM Web Chat 会保留为一行 plain Minecraft 聊天，而不会重复发送 URL 引用行。这样游戏侧表情插件仍然可以读取原始 token 文本。

`default-pack` 和 `aliases` 可用于把扁平的游戏侧 token 映射回 BM Web Chat 的 pack/name id。例如：

```yaml
emoji:
  game-link:
    default-pack: "default"
    aliases:
      wave: "default/wave"
```

GIF/JPG/JPEG/WEBP 表情原文件会自动获得同文件夹 PNG sidecar，以兼容只读取 PNG 文件的游戏侧表情插件。Web UI 会继续使用原始文件，因此 GIF 动画会保留。

## 命令面板

```yaml
commands:
  enabled: false
  allow-all: false
  min-role: ADMIN
  run-from-chat-input: false
  max-length: 0
```

`allow-all: true` 允许 Web UI 执行任意控制台命令，因此只应在 HTTPS 和强认证下使用。`run-from-chat-input: false` 时，命令只能从按钮/弹窗执行。

## 媒体预览高度与滚动稳定性

`ui.image-preview-max-height` 用于限制图片、GIF、视频和 iframe 类预览的显示高度。推荐范围为 `640-720`，默认值为 `720`。

```yaml
ui:
  image-preview-max-height: 720
```

设置为 `0` 表示不限制高度。但非常大的媒体或无限制预览可能会在媒体加载完成时造成可见的滚动跳动，尤其是在同时使用 virtual scroll 和包含大量媒体的长聊天记录时。

## 预览

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

YouTube Shorts 通过普通 YouTube 预览路径处理。Shorts 会以竖屏播放器显示，并使用 YouTube loop 参数。

TikTok 和 X/Twitter 会从查看者的浏览器加载第三方内容，因此是可选功能。只有在服务器策略允许第三方 embed 请求时才建议启用。公开服务器建议保持 `social-embeds.click-to-load: true`，让外部播放器只在用户打开预览后加载。

TikTok 使用官方 `player/v1` iframe，并应用 `description=0`、`music_info=0`。这样可以避免帖子描述或音乐信息长度变化导致聊天面板内出现内部滚动条。完整帖子信息可通过播放器下方的原始 TikTok 链接打开。

将 `youtube-click-to-load` 或 `media-click-to-load` 设为 `false` 会立即渲染对应预览。自动播放仍受浏览器策略控制。

## PIP

```yaml
ui:
  picture-in-picture:
    enabled: false
```

这一个选项同时控制 PIP 按钮和 PIP 执行。浏览器的 URL/关闭按钮 UI、OS 级窗口透明度以及外部 PIP 窗口移动由浏览器/操作系统控制，而不是由聊天设置标题控制。

## 登录失败限制

`security.login-fail-limit`、`security.login-fail-window-seconds` 和 `security.login-lock-seconds` 用于限制 Web 密码登录的连续失败。设置 `login-fail-limit: 0` 可禁用限制。该设置只影响 Web 密码登录。
## 链接代码生成限制

`auth.link-code-cooldown-seconds` 和 `auth.link-code-max-per-minute` 用于限制 Web UI 按远程 IP 生成 `/bmchat auth <code>` 链接代码的频率。将任一值设为 `0` 可禁用对应限制。


### 表情容量显示

`emoji.max-total-size-mb` 用于限制自定义表情的总容量。超过限制时，管理员上传界面会显示警告。`emoji.show-storage-usage` 控制是否显示当前表情容量，`emoji.show-storage-limit` 控制是否显示总容量限制。



## UI 时区

`ui.time-zone` 用于指定聊天时间显示的时区。`local` 表示使用浏览器/设备本地时区，也可以使用 `UTC` 或 `Asia/Seoul` 等 IANA 时区。无效值会在 Web UI 中回退到本地时间。

## HTTP 代理 / 客户端 IP

`http.trusted-proxies` 用于指定哪些代理的 `X-Forwarded-For` 可以被信任。直接公开 HTTP 时请保持为空；如果同一台服务器上使用 Caddy/Nginx，请将 `127.0.0.1` 和 `::1` 写成块状 YAML 列表。`http.log-client-ip-resolution: true` 只建议临时开启，用于在服务器控制台和 `logs/latest.log` 中确认 socket IP、forwarded 头和最终解析出的客户端 IP。完整检查步骤见 `docs/OPERATIONS_SECURITY_ZH_CN.md`。

## SSE 连接数限制

`security.max-sse-connections-per-ip` 和 `security.max-sse-connections-total` 用于限制长期保持的 `/stream` 连接数。各项设置为 `0` 可禁用对应限制。



`ui.text-color` 设置聊天正文的默认文字颜色。`ui.ui-text-color` 设置 UI 文字/图标颜色，例如角色标记、Web/Game 来源、时间、输入框占位文字、上传/命令按钮和置顶消息标签。留空时跟随当前主题。用户也可以在聊天设置中按浏览器覆盖这些颜色。

```yaml
ui:
  text-color: ""          # 正文跟随主题
  ui-text-color: ""       # UI 标签/图标跟随主题
  # text-color: "#f4f4f4"
  # ui-text-color: "#b8d8ff"
```

`ui.input-background-color` 用于全局固定输入框背景颜色。留空时跟随所选主题。用户也可以在聊天设置中按浏览器覆盖此颜色。

```yaml
ui:
  input-background-color: ""      # 主题默认值
  # input-background-color: "#1e1e24"
```

### 系统消息翻译

内置 announcement 和 Web 命令结果消息包含 i18n 键。请将 `announcements.*.message` 保留为回退/自定义文本。语言文件中存在对应键时，查看者会看到所选语言的翻译文本。

折叠的置顶消息栏文字也会使用配置的聊天字体和消息字号。

### Text shadow / readability

- `ui.text-shadow-mode`: `none`、`auto`、`dark`、`light` 或 `custom`。用于在自定义文字/背景颜色对比度较低时提高可读性。
- `ui.text-shadow-custom`: `custom` 模式使用的 CSS `text-shadow` 值。聊天设置界面会以颜色选择器以及水平偏移、垂直偏移、模糊、不透明度滑块进行编辑；保存值仍为标准 CSS 格式，例如 `0 1px 2px rgba(0, 0, 0, 0.85)`。

> 主题也可以在每个浏览器的聊天设置中更改。切换主题时，文字颜色、背景颜色和阴影等外观设置会重置为该主题默认值。


管理员自定义表情说明：重命名表情文件或文件夹会改变 `:emoji:pack/name:` 标记。引用旧标记的既有聊天消息可能不再渲染，除非保留旧文件/文件夹名称。

## 消息搜索

启用存储历史记录时，可以通过聊天面板右上角的浮动区域的放大镜按钮和 `/history/search` API 搜索消息内容和发送者。搜索选项可按日期/时间范围、发送者、来源以及是否包含系统/事件消息进行筛选。搜索结果会显示在可滚动列表中，并遵循聊天主题和字体设置。点击搜索结果会使用现有的周边历史加载跳转到对应消息。带有 i18n 键的系统/事件消息会尽可能按请求的 Web UI 语言搜索和显示。 可通过 `search.enabled` 启用/禁用搜索，且仅用 `search.result-limit` 同时控制 Web UI 结果数量和 `/history/search` API 限制。没有单独的内部最大值：设置为 2000 时最多返回 2000 条，设置为 10 时最多返回 10 条。10000 或 100000 这类非常大的值也会被接受，但可能导致搜索变慢、响应体变大，并显著增加 CPU、内存和数据库负载。默认值为 50，普通使用建议 50-200。旧版 config.yml 需要手动添加这些项目，或与默认配置合并。
