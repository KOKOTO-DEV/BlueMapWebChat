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
standalone-web:
  enabled: true
  path: "/chat"
  api-base-url: ""
```

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
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```


## 透明窗口限制

standalone 浏览器窗口和 Document Picture-in-Picture 窗口无法仅通过普通 Web API 变成操作系统级的真正透明窗口。CSS 可以让聊天面板本身半透明，但浏览器/PIP 窗口背景和桌面透视由浏览器或操作系统控制。
