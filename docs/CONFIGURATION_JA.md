# BlueMapWebChat 設定リファレンス

`plugins/BlueMapWebChat/config.yml` の説明です。

## 配置モード

### BlueMap アドオン

```yaml
web-addon:
  auto-install: true
  auto-patch-webapp-conf: true
```

`addons/bluemap-web-chat` にファイルを配置し、BlueMap の `webapp.conf` を更新します。

### standalone のみ

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```

`http://<server-host>:8899/chat` を開きます。

### HTTPS リバースプロキシ

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

## 0 が無制限/最大値なしを意味する項目

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

## 固定メッセージ

`pinned.show-to-logged-out` は、Webログイン前にも固定メッセージを表示するかを制御します。ログイン済みユーザーにのみ表示したい場合は `false` にします。

## 固定/削除表示トグル

メッセージごとの固定/削除ボタンは誤操作を避けるため既定では非表示です。ADMIN/MOD ユーザーは管理パネルの Web 履歴クリアボタン横にある固定/削除トグルをオンにすると表示できます。このトグルは保存されず、再読み込みするとオフに戻ります。

## UI

```yaml
ui:
  language: "en-US"        # en-US, ko-KR, ja-JP, zh-CN
  language-fallback: "en-US"
  theme: "system"          # system, dark, light, high-contrast
  opacity: 0.92
```

ユーザー別の表示設定はブラウザの localStorage に保存されます。

## プレイヤー名

```yaml
player-display:
  mode: "name"             # name, display-name, custom-name
  strip-colors: true
```

`strip-colors: false` の場合、実際のチャット送信者名だけ Minecraft legacy 色コードをレンダリングします。参加/退出/死亡/進捗などの system/event メッセージは常に色コードを削除します。

## コマンドパネル

```yaml
commands:
  enabled: false
  allow-all: false
  min-role: ADMIN
  run-from-chat-input: false
  max-length: 0
```

`allow-all: true` は Web UI から任意のコンソールコマンドを実行できるため、HTTPS と強い認証が前提です。`run-from-chat-input: false` の場合、コマンドはボタン/モーダルからのみ実行されます。

## メディアプレビューの高さとスクロール安定性

`ui.image-preview-max-height` は画像、GIF、動画、iframe 系プレビューの表示高さを制限します。推奨範囲は `640-720` で、デフォルトは `720` です。

```yaml
ui:
  image-preview-max-height: 720
```

`0` にすると高さ制限なしになります。ただし、非常に大きいメディアまたは無制限プレビューは、メディアの読み込み完了時にスクロールジャンプを起こすことがあります。特に virtual scroll とメディアの多い長いチャット履歴を併用する場合に発生しやすくなります。

## プレビュー

```yaml
preview:
  youtube-click-to-load: true
  media-click-to-load: true
```

`false` にすると iframe/player をすぐに表示します。自動再生はブラウザのポリシーに従います。

## PIP

```yaml
ui:
  picture-in-picture:
    enabled: false
```

この 1 つの設定で PIP ボタンと PIP 実行を制御します。ブラウザの URL/閉じる UI、OS レベルのウィンドウ透明化、外側の PIP ウィンドウ移動はチャット設定タイトルではなくブラウザ/OS 側で制御されます。

## ログイン失敗制限

`security.login-fail-limit`, `security.login-fail-window-seconds`, `security.login-lock-seconds` は Web パスワードログインの連続失敗を制限します。`login-fail-limit: 0` で無効化できます。この設定は Web パスワードログインにのみ適用されます。
## リンクコード発行制限

`auth.link-code-cooldown-seconds` と `auth.link-code-max-per-minute` は、Web UI が `/bmchat auth <code>` 用のリンクコードをリモート IP ごとに発行できる頻度を制限します。各値を `0` にすると、その制限を無効化できます。


## UI タイムゾーン

`ui.time-zone` はチャット時刻表示のタイムゾーンを指定します。`local` はブラウザー/端末のローカルタイムゾーンを使い、`UTC` や `Asia/Seoul` などの IANA タイムゾーンも指定できます。不正な値は Web UI でローカル時刻にフォールバックします。

## HTTP プロキシ / クライアント IP

`http.trusted-proxies` は `X-Forwarded-For` を信頼するプロキシを指定します。直接 HTTP で公開する場合は空のままにしてください。同じサーバー上の Caddy/Nginx 経由なら `127.0.0.1` と `::1` をブロック形式の YAML リストとして設定してください。`http.log-client-ip-resolution: true` は、ソケット IP、forwarded ヘッダー、解決後のクライアント IP をサーバーコンソールと `logs/latest.log` で確認する時だけ一時的に使ってください。詳しい確認手順は `docs/OPERATIONS_SECURITY_JA.md` を参照してください。

## SSE 接続数制限

`security.max-sse-connections-per-ip` と `security.max-sse-connections-total` は、長時間維持される `/stream` 接続数を制限します。各値は `0` で無効化できます。



`ui.text-color` はチャット本文の既定文字色です。`ui.ui-text-color` は権限表示、Web/Game の送信元表示、時刻、入力欄のプレースホルダー、アップロード/コマンドボタン、ピン留めラベルなどの UI 文字/記号の既定色です。空にすると選択中のテーマに従います。ユーザーはチャット設定でブラウザーごとに上書きできます。

```yaml
ui:
  text-color: ""          # 本文はテーマ既定
  ui-text-color: ""       # UI 表示/記号はテーマ既定
  # text-color: "#f4f4f4"
  # ui-text-color: "#b8d8ff"
```

`ui.input-background-color` は入力欄の背景色を全体設定で固定します。空のままにすると選択中のテーマに従います。ユーザーはチャット設定でブラウザーごとに上書きできます。

```yaml
ui:
  input-background-color: ""      # テーマ既定
  # input-background-color: "#1e1e24"
```

### システムメッセージ翻訳

組み込み announcement と Web コマンド結果メッセージには i18n キーが含まれます。`announcements.*.message` はフォールバック/カスタム文として保持してください。該当キーが言語ファイルにある場合、閲覧者には選択言語の翻訳文が表示されます。

折りたたまれた固定メッセージバーの文字も、設定されたチャットフォントとメッセージ文字サイズに従います。
