# BlueMap dependency / standalone mode review

## Summary

The Java plugin does not depend on the BlueMap API. `plugin.yml` does not declare BlueMap as a `depend` or `softdepend`, and the Java sources do not import BlueMap classes. The runtime dependency is Bukkit/Spigot-compatible server APIs. DiscordSRV integration is optional.

The chat feature can therefore run without BlueMap. The BlueMap-specific part is the optional web addon installer that copies web assets into the BlueMap web directory and patches `webapp.conf`.

## Supported modes

BlueMapWebChat currently supports both modes:

```text
BlueMap addon panel
Standalone /chat page
```

Standalone mode is disabled by default. Enable it explicitly when needed:

```yaml
standalone-web:
  enabled: true
  path: "/chat"
  api-base-url: ""
```

Direct HTTP URL:

```text
http://<server-host>:8899/chat
```

HTTPS reverse-proxy URL example:

```text
https://<domain>/bmwc/chat
```

## Standalone-only deployment

Use this when you do not want any chat UI injected into BlueMap:

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```


## Transparency limitation

Standalone browser windows and Document Picture-in-Picture windows cannot be made true OS-level transparent windows through normal web APIs. CSS can make the chat panel itself translucent, but the browser/PIP window background and desktop pass-through transparency are controlled by the browser or operating system.
