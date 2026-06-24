# BlueMapWebChat

适用于 Bukkit/Paper/Spigot 系服务器的 Web 聊天插件。可以作为 BlueMap Web 插件显示，也可以不依赖 BlueMap，直接使用 standalone `/chat` 页面。

## 主要功能

- BlueMap 内嵌聊天面板，或 standalone Web 聊天页面
- 游戏 ↔ Web 双向聊天
- 访客聊天、数学验证码、冷却与每分钟限制
- 通过 `/bmchat auth <code>` 绑定账号、Web 密码登录、本地管理员账号
- Web 管理/版主面板、隐藏消息、访客/IP 禁言、撤销会话
- 管理员自定义表情管理：创建、上传、重命名和删除表情文件夹/文件
- 文件/剪贴板上传，图片/视频/音频/YouTube/Shorts 预览，以及可选的 TikTok 和 X/Twitter 嵌入
- DiscordSRV 转发，Discord CDN 媒体缓存
- 回复与跳转到原消息、置顶消息、虚拟滚动、可拖动/缩放窗口、实验性 PIP
- UI 语言: en-US, ko-KR, ja-JP, zh-CN

## 构建

```bash
mvn clean package
```

```text
target/BlueMapWebChat-4.0.0.jar
```

## 安装

1. 将 jar 放入 `plugins/`。
2. 启动一次服务器，生成 `plugins/BlueMapWebChat/config.yml`。
3. 如果要嵌入 BlueMap，保持 `web-addon.auto-install` 和 `web-addon.auto-patch-webapp-conf` 为 `true`。
4. 如果只使用 standalone，设置 `standalone-web.enabled: true`，并将 `web-addon.auto-install`、`web-addon.auto-patch-webapp-conf` 设为 `false`。
5. 重启服务器或执行 `/bmchat reload`。如果 BlueMap Web 资源没有刷新，再执行 `/bluemap reload`。

## standalone URL

```text
http://<server-host>:8899/chat
```

## HTTPS / Caddy 推荐配置

公开服务器建议将 BlueMap 和 BlueMapWebChat 保持为内部 HTTP 服务，并通过 HTTPS 反向代理对外提供。

```yaml
http:
  host: "127.0.0.1"
  port: 8899
  path-prefix: "/api"
  cors-origin: "https://map.example.com"

standalone-web:
  enabled: true
  path: "/chat"
  # 可选。可以与 web-addon.api-base-url 使用同一路径。
  api-base-url: "/bmwc/api"

web-addon:
  api-base-url: "/bmwc/api"

upload:
  # 推荐留空。上传 URL 会自动跟随 /bmwc/api。
  # 旧式显式写法也可用: "/bmwc/api" 或 "/bmwc/api/uploads"
  public-base-url: ""

emoji:
  # 推荐留空。表情 URL 会自动跟随 /bmwc/api。
  # 旧式显式写法也可用: "/bmwc/api" 或 "/bmwc/api/emojis"
  public-base-url: ""
  max-total-size-mb: 64
  show-storage-usage: true
  show-storage-limit: true
```

更多内容见 `docs/CADDY_HTTPS_ZH_CN.md`。

## 常用设置

- `ui.language`: `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: 为 `false` 时，实际聊天发送者名称会渲染 Minecraft legacy 颜色代码。system/event 消息始终会去除颜色代码。
- `commands.enabled`: Web 命令面板
- `commands.allow-all`: 允许任意控制台命令
- `commands.run-from-chat-input`: 允许从普通输入框执行 `/command`
- `ui.picture-in-picture.enabled`: 控制 PIP 按钮和 PIP 执行

## 自定义表情与 ImageEmojis

BlueMapWebChat 将自定义表情保存到 `plugins/BlueMapWebChat/emojis`。子文件夹会作为表情包处理。

当 `emoji.game-link.mode` 设置为 `imageemojis` 或 `imageemojis-link` 时，GIF/JPG/JPEG/WEBP 原始文件旁边会自动生成供 ImageEmojis 使用的 PNG sidecar。例如，将 `wave.gif` 上传到 `default` 表情包后，会生成：

```text
plugins/BlueMapWebChat/emojis/default/wave.gif
plugins/BlueMapWebChat/emojis/default/wave.png
```

Web UI 会继续使用原始文件，因此 GIF 动画会保留。ImageEmojis 可以读取 PNG sidecar。如果 ImageEmojis 指向同一个表情目录，添加或修改表情后请执行 `/emojis reload`。

## YouTube Shorts、TikTok 和 X/Twitter 预览

YouTube Shorts URL 由普通 YouTube 预览处理，使用竖屏播放器并循环播放，默认启用。TikTok 和 X/Twitter 作为可选 social embed 提供，因为会从用户浏览器加载第三方内容，所以默认关闭。TikTok 使用官方 `player/v1` iframe，并在聊天面板中隐藏较长的描述/音乐信息，以避免内部滚动条；完整信息可通过原始 TikTok 链接打开。

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

只有在允许用户浏览器发起第三方 embed 请求的服务器上，才建议启用 TikTok 或 X/Twitter。公开服务器建议保持 `click-to-load: true`，让第三方内容只在用户打开预览后加载。

## 命令

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

## 权限

```text
bluemapwebchat.auth
bluemapwebchat.webchat
bluemapwebchat.admin
```

## 文档

- `docs/CONFIGURATION_ZH_CN.md`
- `docs/CADDY_HTTPS_ZH_CN.md`
- `docs/I18N_ZH_CN.md`
- `docs/INSTALL_TROUBLESHOOTING_ZH_CN.md`
- `docs/UPLOAD_SECURITY_ZH_CN.md`
- `docs/RELEASE_CHECKLIST_ZH_CN.md`
- `docs/STANDALONE_REVIEW_ZH_CN.md`
- `docs/OPERATIONS_SECURITY_ZH_CN.md`

字体说明：已安装字体需要输入 CSS font-family 名称。聊天设置中的检测按钮可在不请求本地字体权限的情况下，估算当前浏览器是否可使用该名称。


URL 设置说明：HTTPS 反向代理模式下，将 `web-addon.api-base-url` 设为 `/bmwc/api` 这样的公开 API 路径。`standalone-web.api-base-url`、`upload.public-base-url`、`emoji.public-base-url` 通常留空。留空时，standalone 会复用 web-addon API base，上传/表情会自动追加 `/uploads` 和 `/emojis`。也支持显式值 `/bmwc/api`、`/bmwc/api/uploads`、`/bmwc/api/emojis`。不带前导 `/` 的相对值会在 `http.cors-origin` 为实际 origin 时基于该 origin 解析。
