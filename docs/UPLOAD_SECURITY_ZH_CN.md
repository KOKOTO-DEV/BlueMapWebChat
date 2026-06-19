# BlueMapWebChat 上传安全说明

文件上传很方便，但在公网服务器上可能被滥用。默认配置会禁用访客上传。

## 推荐默认值

```yaml
upload:
  enabled: true
  allow-guest-upload: false
  allow-user-upload: true
  allow-moderator-upload: true
  allow-admin-upload: true
  max-file-size-mb: 20
  max-files-per-message: 3
  cooldown-seconds: 5
  max-uploads-per-minute: 4
  retention-days: 5
```

## 公网服务器

除非有额外审核流程，否则请保持访客上传关闭。如果必须启用访客上传，请降低文件大小限制并缩短保留时间。

## 公开 URL

直接 HTTP 示例:

```yaml
upload:
  public-base-url: ""
```

同域 HTTPS 反向代理示例:

```yaml
web-addon:
  api-base-url: "/bmwc/api"

upload:
  public-base-url: "/bmwc/api/uploads"
```

以 `/` 开头的值会按同源浏览器路径处理。同域代理部署不需要使用完整 FQDN。

## 允许扩展名

只允许你确实希望在聊天中显示或分享的文件类型。BlueMapWebChat 会按扩展名和大小限制，但公网部署仍建议从受限目录提供上传文件并使用 HTTPS。
