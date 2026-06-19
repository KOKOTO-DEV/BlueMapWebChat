# BlueMapWebChat アップロードのセキュリティ注意点

ファイルアップロードは便利ですが、公開サーバーでは悪用される可能性があります。既定設定ではゲストアップロードは無効です。

## 推奨既定値

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

## 公開サーバー

別のモデレーション体制がない限り、ゲストアップロードは無効のままにしてください。有効にする場合はファイルサイズ制限を下げ、保持期間を短くしてください。

## 公開 URL

直接 HTTP 例:

```yaml
upload:
  public-base-url: ""
```

同一ドメイン HTTPS プロキシ例:

```yaml
web-addon:
  api-base-url: "/bmwc/api"

upload:
  public-base-url: "/bmwc/api/uploads"
```

先頭が `/` の値は同一 origin のブラウザパスとして扱われます。同一ドメインプロキシでは完全な FQDN は不要です。

## 許可拡張子

チャットで表示または共有したいファイル形式だけを許可してください。BlueMapWebChat は拡張子とサイズで制限しますが、公開運用では制限されたディレクトリから配信し、HTTPS を使うことを推奨します。
