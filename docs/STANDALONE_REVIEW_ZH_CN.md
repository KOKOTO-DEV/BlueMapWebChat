# BlueMap 依赖 / standalone 模式检查

## 概要

Java 插件本体不依赖 BlueMap API。`plugin.yml` 没有声明 BlueMap `depend` / `softdepend`，Java 源码中也没有 BlueMap API import。运行时依赖是 Bukkit/Spigot 兼容服务器 API。DiscordSRV 集成是可选项。

因此，聊天功能本身可以在没有 BlueMap 的情况下运行。BlueMap 特有的部分是可选的 web addon 安装器，用于把 web 资源复制到 BlueMap web 目录并修改 `webapp.conf`。

## 支持模式

BlueMapWebChat 当前支持两种模式：

```text
BlueMap addon panel
standalone /chat page
```

standalone 模式默认关闭，需要时请显式启用。

```yaml
  api-base-url: ""
```

`standalone-web.api-base-url` 可以留空以自动检测。如果 standalone 页面与 BlueMap 内嵌聊天共用同一个反向代理 API 路径，也可以设置为与 `web-addon.api-base-url` 相同的值，例如 `/bmwc/api`。

直接 HTTP URL：

```text
http://<server-host>:8899/chat
```

HTTPS 反向代理 URL 示例：

```text
https://<domain>/bmwc/chat
```

## 仅 standalone 部署

如果不想在 BlueMap 地图中注入聊天 UI，请使用以下设置：

```yaml
web-addon:
  auto-install: false
  auto-patch-webapp-conf: false

standalone-web:
  enabled: true
  path: "/chat"
```



## 透明窗口限制

standalone 浏览器窗口和 Document Picture-in-Picture 窗口无法仅通过普通 Web API 变成操作系统级的真正透明窗口。CSS 可以让聊天面板本身半透明，但浏览器/PIP 窗口背景和桌面透视由浏览器或操作系统控制。

### URL 设置解析规则

`web-addon.api-base-url` 是 HTTPS 公开 API 路径的基准。除非需要兼容覆盖，`standalone-web.api-base-url`、`upload.public-base-url`、`emoji.public-base-url` 通常留空。standalone 留空会使用 `web-addon.api-base-url`；upload/emoji 留空会分别追加 `/uploads` 和 `/emojis`。`/bmwc/api` 这类绝对浏览器路径会原样使用。不带前导 `/` 的相对值会在 `http.cors-origin` 为实际 origin 时基于该 origin 解析。完整 `https://...` URL 原样使用。


