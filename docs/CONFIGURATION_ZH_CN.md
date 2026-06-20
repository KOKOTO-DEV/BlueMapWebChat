# BlueMapWebChat 配置参考

本文说明 `plugins/BlueMapWebChat/config.yml`。

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
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```

访问 `http://<server-host>:8899/chat`。

### HTTPS 反向代理

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

## 0 表示无限制/无最大值的选项

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

当 `strip-colors: false` 时，仅实际聊天发送者名称会渲染 Minecraft legacy 颜色代码。加入/退出/死亡/进度等 system/event 消息始终会去除颜色代码。

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
  youtube-click-to-load: true
  media-click-to-load: true
```

设为 `false` 时会立即渲染 iframe/player。自动播放仍受浏览器策略限制。

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
