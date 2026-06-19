# BlueMapWebChat

适用于 Bukkit/Paper/Spigot 系服务器的 Web 聊天插件。可以作为 BlueMap Web 插件显示，也可以不依赖 BlueMap，直接使用 standalone `/chat` 页面。

## 主要功能

- BlueMap 内嵌聊天面板，或 standalone Web 聊天页面
- 游戏 ↔ Web 双向聊天
- 访客聊天、数学验证码、冷却与每分钟限制
- 通过 `/bmchat auth <code>` 绑定账号、Web 密码登录、本地管理员账号
- Web 管理/版主面板、隐藏消息、访客/IP 禁言、撤销会话
- 文件/剪贴板上传，图片/视频/音频/YouTube 预览
- DiscordSRV 转发，Discord CDN 媒体缓存
- 置顶消息、虚拟滚动、可拖动/缩放窗口、实验性 PIP
- UI 语言: en-US, ko-KR, ja-JP, zh-CN


## 媒体预览高度与滚动稳定性

推荐的媒体预览最大高度为 `640-720px`。默认值为 `ui.image-preview-max-height: 720`。

启用该限制可在使用 virtual scroll 时获得更好的滚动稳定性。设置为 `0` 表示不限制高度，但非常大的图片/GIF/视频/iframe 预览可能会在媒体加载完成时造成可见的滚动跳动，尤其是在包含大量媒体的长聊天记录中。

```yaml
ui:
  image-preview-max-height: 720
```

## 构建

```bash
mvn clean package
```

```text
target/BlueMapWebChat-3.0.0.jar
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

## HTTPS / 反向代理推荐配置

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
  api-base-url: "/bmwc/api"

web-addon:
  api-base-url: "/bmwc/api"

upload:
  public-base-url: "/bmwc/api/uploads"
```

Caddy 见 `docs/CADDY_HTTPS_ZH_CN.md`，nginx 见 `docs/NGINX_HTTPS_ZH_CN.md`。

## 常用设置

- `ui.language`: `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `ui.image-preview-max-height`: 推荐 `640-720`；`0` 表示无限制，在媒体较多的 virtual scroll 中可能导致滚动跳动
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: 为 `false` 时，实际聊天发送者名称会渲染 Minecraft legacy 颜色代码。system/event 消息始终会去除颜色代码。
- `commands.enabled`: Web 命令面板
- `commands.allow-all`: 允许任意控制台命令
- `commands.run-from-chat-input`: 允许从普通输入框执行 `/command`
- `ui.picture-in-picture.enabled`: 控制 PIP 按钮和 PIP 执行

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
- `docs/NGINX_HTTPS_ZH_CN.md`
- `docs/I18N_ZH_CN.md`
- `docs/INSTALL_TROUBLESHOOTING_ZH_CN.md`
- `docs/UPLOAD_SECURITY_ZH_CN.md`
- `docs/RELEASE_CHECKLIST_ZH_CN.md`
- `docs/STANDALONE_REVIEW_ZH_CN.md`
- `docs/OPERATIONS_SECURITY_ZH_CN.md`

字体说明：已安装字体需要输入 CSS font-family 名称。聊天设置中的检测按钮可在不请求本地字体权限的情况下，估算当前浏览器是否可使用该名称。
聊天设置可以分别调整消息正文颜色和 UI 文字/图标颜色。UI 颜色会应用到角色标记、Web/Game 来源、时间、占位文字、上传/命令按钮和置顶标签。
折叠的置顶消息文字也会使用配置的聊天字体和消息字号。服务器 announcement 和 Web 命令结果等内置系统消息在存在 i18n 键时会按语言文件翻译。
