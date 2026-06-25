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
web-addon:
  auto-install: false
  auto-patch-webapp-conf: false

standalone-web:
  enabled: true
  path: "/chat"
```

`http://<server-host>:8899/chat` を開きます。

### HTTPS リバースプロキシ

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
  # 推奨は空です。web-addon.api-base-url に従います。
  # 同じ公開 API 経路を明示する場合は "/bmwc/api" も使えます。
  api-base-url: ""

upload:
  # 推奨は空です。アップロード URL は有効な API base に自動追従します。
  # 従来の明示値も使えます: "/bmwc/api" または "/bmwc/api/uploads"
  public-base-url: ""

emoji:
  # 推奨は空です。絵文字 URL は有効な API base に自動追従します。
  # 従来の明示値も使えます: "/bmwc/api" または "/bmwc/api/emojis"
  public-base-url: ""
```

### 公開 URL オプションの規則

- `http.path-prefix` はプラグイン内部の HTTP API 経路です。通常は既定の `/api` のままにします。
- `web-addon.api-base-url` は BlueMap 埋め込みチャットが使う公開 API base です。HTTPS リバースプロキシでは通常 `/bmwc/api` にします。
- `standalone-web.api-base-url` は通常空のままにします。空の場合は `web-addon.api-base-url` を再利用します。例: `/bmwc/chat` は `/bmwc/api` を使います。必要なら同じ `/bmwc/api` を明示しても構いません。
- `upload.public-base-url` は通常空のままにします。空の場合は有効な API base に `/uploads` を追加します。例: `/bmwc/api/uploads`。
- `emoji.public-base-url` は通常空のままにします。空の場合は有効な API base に `/emojis` を追加します。例: `/bmwc/api/emojis`。
- 明示値も使えます。`/bmwc/api` を指定すると upload は `/uploads`、emoji は `/emojis` を自動で追加します。`/bmwc/api/uploads`、`/bmwc/api/emojis` はそのまま使います。
- 先頭 `/` のない相対値、例: `bmwc/api`、`bmwc/api/uploads`、`bmwc/api/emojis` は、`http.cors-origin` が実際の origin のときその origin を前に付けます。`cors-origin: "*"` の場合は `/bmwc/api...` のような同一 origin の絶対パスとして扱います。
- `https://map.example.com/bmwc/api` のような完全 URL はそのまま使います。

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
- `preview.social-embeds.max-embeds-per-message`
- `preview.external-media-cache-max-size-mb`
- `pinned.max-pins`
- `pinned.show-to-logged-out`
- `commands.max-length`

## Minecraft チャットでの返信表示

```yaml
reply:
  game-preview:
    enabled: true
    format: "&7↪ {sender}: {preview}"
    max-length: 120

  game-prefix:
    enabled: true
    text: "[Reply] "
```

Web またはゲストメッセージが別のメッセージへ返信する場合、`game-preview.enabled` は参照元メッセージのプレビューを実際の Web メッセージの前に Minecraft チャットへ別行で送信します。これにより、通常の Web→ゲーム形式を保ったまま、引用行と本文行の URL をそれぞれクリック可能にできます。

プレビュー文は通常の Web メッセージと同じ Web→ゲーム用カスタム絵文字経路を通ります。プレビュー内のカスタム絵文字トークンは `emoji.game-link.label-format` に従って整形され、長いプレビューは `max-length` に従って `…` で省略されます。`0` にするとプレビュー固有の省略を無効化します。

`game-prefix` は実際の返信メッセージ行のラベル/prefix を制御します。既定の Web 形式では `[Web] Player: message` を `[Reply] Player: message` に変更します。BlueMapWebChat は、すでにレンダリングされた中継行の先頭付近にある最初の角括弧ソースラベルを置き換えます。角括弧ラベルがない場合は prefix テキストを先頭に追加します。同じ返信プレビューとラベルは web-to-Discord 中継にも適用されます。

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

## カスタム絵文字とゲーム側絵文字プラグイン

BlueMapWebChat はカスタム絵文字を `plugins/BlueMapWebChat/emojis` に保存します。サブフォルダーは絵文字パックとして扱われます。

`emoji.game-link.mode` は `link` と `label` のみをサポートします。

- `link`: `label-format` の文字列と BM Web Chat の短い画像リンクを送信します。
- `label`: `label-format` の文字列だけを送信します。

BM Web Chat は ImageEmojis などのゲーム側絵文字プラグインを直接呼び出さず、リソースパックや生成済み glyph も読み取りません。外部のゲーム側絵文字プラグインが同じトークン文字列を使う場合、Minecraft チャット内でそのトークンをレンダリングできます。

`plain-broadcast-with-urls` は、同じメッセージにカスタム絵文字トークンと URL が含まれる場合の処理を制御します。既定値 `true` では、元の行を plain Bukkit チャットとして送信してゲーム側絵文字プラグインがトークンを描画できるようにし、各 URL を別のクリック可能な参照行として再送信します。絵文字が URL の前でも後でも同じように処理されます。

`default-pack` と `aliases` は、短いゲーム側トークンを BM Web Chat の pack/name id に対応付けるために使います。例:

```yaml
emoji:
  game-link:
    default-pack: "default"
    aliases:
      wave: "default/wave"
```

GIF/JPG/JPEG/WEBP の絵文字元ファイルには、PNG だけを読めるゲーム側絵文字プラグインとの互換性のため、同じフォルダーに PNG sidecar が自動生成されます。Web UI は元ファイルを使うため、GIF アニメーションは維持されます。

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

YouTube Shorts は通常の YouTube プレビュー経路で処理されます。Shorts は縦型プレイヤーで表示され、YouTube の loop パラメーターを使用します。

TikTok と X/Twitter は、閲覧者のブラウザーから外部コンテンツを読み込むため任意機能です。サーバーポリシーで外部 embed を許可できる場合のみ有効にしてください。公開サーバーでは `social-embeds.click-to-load: true` を維持し、ユーザーがプレビューを開いたときだけ外部プレイヤーを読み込む設定が安全です。

TikTok は公式 `player/v1` iframe を使用し、`description=0` と `music_info=0` を適用します。これにより、投稿本文や音楽情報の長さによってチャットパネル内に内部スクロールバーが出る問題を避けます。完全な投稿情報はプレイヤー下の元 TikTok リンクから開けます。

`youtube-click-to-load` または `media-click-to-load` を `false` にすると、対象のプレビューを即時表示します。自動再生はブラウザーのポリシーに従います。

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


### 絵文字容量表示

`emoji.max-total-size-mb` はカスタム絵文字の合計容量を制限します。制限を超えると、管理者アップロード画面に警告が表示されます。`emoji.show-storage-usage` は現在の絵文字容量表示、`emoji.show-storage-limit` は合計容量制限の表示を制御します。

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

### Text shadow / readability

- `ui.text-shadow-mode`: `none`、`auto`、`dark`、`light`、`custom` のいずれかです。文字色と背景色のコントラストが低い場合の視認性を補助します。
- `ui.text-shadow-custom`: `custom` モードで使用する CSS `text-shadow` 値です。チャット設定画面では、色ピッカーと横方向、縦方向、ぼかし、不透明度のスライダーで編集できます。保存値は標準の CSS 形式です。例: `0 1px 2px rgba(0, 0, 0, 0.85)`.

> テーマはブラウザごとのチャット設定からも変更できます。テーマを変更すると、文字色・背景色・影などの表示設定はそのテーマの既定値にリセットされます。


管理者向けカスタム絵文字メモ: 絵文字ファイル名またはフォルダー名を変更すると `:emoji:pack/name:` トークンも変わります。古いトークンを含む既存メッセージは、古いファイル/フォルダー名を残さない限り表示されなくなる場合があります。
