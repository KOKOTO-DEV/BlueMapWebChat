# BlueMapWebChat 設定リファレンス

`plugins/BlueMapWebChat/config.yml` の説明です。

## 全体有効化スイッチ

新規生成された config は最上位の `enabled: false` から始まります。この状態では BlueMapWebChat は config の生成/読み込みのみを行い、/bmchat reload は引き続き使用できますが、Web/チャットサービス、リスナー、Discord 連携、DM ストア、アドオン設置、アップロード/絵文字初期化、クリーンアップ処理を開始しません。既存 config にこのキーがない場合は、アップグレード互換性のため有効として扱います。保存方式、保持期間、アップロード、プレビュー、認証、公開設定を確認してから `enabled: true` に変更してください。

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

## チャット履歴保存

チャット履歴は `chat.history-storage` で `memory`、`jsonl`、`sqlite` のいずれかを選びます。`chat.history-size` と `chat.history-retention-days` は 3 つのモードで共通です。`0` は件数/期間の制限なしを意味します。新規生成された config は最上位の `enabled: false` から始まるため、これらの値を確認して `enabled: true` にするまでクリーンアップ処理は実行されません。サーバー方針として古いチャットの自動削除が必要な場合は、`30` や `90` などの正の保持日数を設定してください。アップロードと外部メディアキャッシュの保持設定も同じ考え方です。`chat.history-file` は JSONL のみ、`chat.history-sqlite-file` は SQLite のみで使われます。

## 1:1 ダイレクトメッセージスレッド

`direct-message.enabled` を有効にすると、1:1 会話スレッド型のメッセージボックスを使用できます。送信先は UUID/名前が保存済みの、連携済みまたは参加履歴のあるプレイヤーに限定されます。スレッドは 2 つの UUID をソートしたペアで識別されるため、A→B と B→A は常に同じ会話に入ります。メッセージは `direct-message.storage` で指定した専用 DM ストアに保存されます。`auto` は公開チャットが `jsonl` 保存方式のとき DM も JSONL を使い、それ以外では SQLite を使います。SQLite は `direct-message.sqlite-file`、JSONL は `direct-message.jsonl-file` を使います。

`direct-message.retention-days: 0` は保持期限なしです。1 以上の値は DM 画面のタイトル横に保持期間として表示され、その日数を過ぎた DM 本文は物理削除されます。`direct-message.max-messages-per-thread: 0` はスレッドごとの件数整理なしです。`direct-message.confirm-hide` は Web UI で自分の表示から DM を隠す前に確認するかを制御します。個人メッセージがサーバーに保存されるため既定では無効です。

## 0 が無制限/最大値なしを意味する項目

- `chat.history-size`
- `chat.history-retention-days`
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
- `direct-message.retention-days`
- `direct-message.max-messages-per-thread`
- `direct-message.max-message-length`

## ゲストチャット制限

```yaml
guest:
  cooldown-seconds: 6
  max-messages-per-minute: 50
```

ゲストチャットは `cooldown-seconds` と `max-messages-per-minute` の両方で制限されます。1分あたりの既定値は `50` メッセージです。既存サーバーの設定ファイルは自動で上書きされないため、既存環境で新しい既定値を使う場合は `plugins/BlueMapWebChat/config.yml` を手動で更新してください。

## Minecraft チャットでの返信表示

```yaml
reply:
  game-preview:
    enabled: true
    format: "&7{sender}: {preview}"
    max-length: 120

  game-prefix:
    enabled: true
    text: "↪ [Reply] "
```

Web またはゲストメッセージが別のメッセージへ返信する場合、`game-preview.enabled` は参照元メッセージのプレビューを実際の Web メッセージの前に Minecraft チャットへ別行で送信します。これにより、通常の Web→ゲーム形式を保ったまま、引用行と本文行の URL をそれぞれクリック可能にできます。

プレビュー文は通常の Web メッセージと同じ Web→ゲーム用カスタム絵文字処理を通ります。既定のトークン保持設定ではカスタム絵文字トークンは変更されず、`emoji.game-link.enabled` を明示的に有効にした場合は選択した game-link mode が適用されます。長いプレビューは `max-length` に従って `…` で省略されます。`0` にするとプレビュー固有の省略を無効化します。

`game-prefix` は実際の返信メッセージ行のラベル/prefix を制御します。既定の Web フォーマットでは `[Web] Player: message` を `↪ [Reply] Player: message` に変更します。BlueMapWebChat は、既にレンダリングされた relay 行の先頭付近にある最初の角括弧ソースラベルを置き換えます。該当するラベルがない場合は prefix テキストを前に付けます。

`game-preview.format` と `game-prefix.text` はどちらも `&7` などの Minecraft legacy 色コードに対応しています。

## Discord 連携オプション

```yaml
discordsrv:
  append-web-emoji-links: true
  game-to-discord: false
  append-game-emoji-links: true
  max-emoji-links-per-message: 4
  reply-relay:
    enabled: false
    prefix-enabled: true
    preview-enabled: true
    preview-max-length: 120
```

`discordsrv.append-web-emoji-links` は、Web→Discord メッセージに BM Web Chat カスタム絵文字トークンの画像 URL を追加します。`discordsrv.append-game-emoji-links` は、可能な場合 DiscordSRV の通常の Minecraft→Discord リレー本文を編集し、ゲーム側トークンの画像 URL を追加します。任意機能の `discordsrv.game-to-discord` は BM Web Chat がゲームチャットを Discord へ直接送信するための機能なので、DiscordSRV が通常の Minecraft チャットを既に中継している場合は重複を避けるため無効のままにしてください。これらは Web→Minecraft チャットのみに影響する `emoji.game-link.*` とは別の設定です。

`discordsrv.reply-relay` は、Web の返信プレビューを Discord にも送るかどうかを制御します。Discord メッセージに予期しない追加行が出ないよう、既定では無効です。

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

`strip-colors: false` の場合、Web UI では実際のチャット送信者名にのみ Minecraft legacy 色コードを描画します。システム/イベントメッセージと Discord 出力では、生の Minecraft 色コードを除去します。保存済みの表示名も再利用時に現在の `strip-colors` 設定で正規化されます。

## カスタム絵文字とゲーム側絵文字プラグイン

BlueMapWebChat はカスタム絵文字を `plugins/BlueMapWebChat/emojis` 以下に保存します。サブフォルダーは絵文字パックとして扱われます。

既定では `emoji.game-link.enabled` が `false` のため、Web→ゲームメッセージの `:pack/name:` や `:emoji:pack/name:` のようなカスタム絵文字トークンは変更されません。ImageEmojis などのゲーム側絵文字プラグインが Minecraft チャット内でトークンを描画する場合は、この既定値を使用してください。

`emoji.game-link.enabled` が `true` の場合、`emoji.game-link.mode` は `preserve`、`link`、`label` をサポートします。

- `preserve`: game-link が有効でもトークン保持動作を強制します。
- `link`: `label-format` テキストと短い BM Web Chat 画像リンクを送信します。
- `label`: `label-format` テキストのみを送信します。

`emoji.game-link.*` は Web→Minecraft チャットのみに影響します。Discord の画像プレビューリンクは、Web→Discord 用の `discordsrv.append-web-emoji-links` と Game→Discord 用の `discordsrv.append-game-emoji-links` で分けて制御します。`append-game-emoji-links` は可能な場合 DiscordSRV の通常の Minecraft→Discord リレー本文を編集し、`game-to-discord` は BM Web Chat がゲームチャットを Discord へ直接送信したい場合にのみ必要です。

BM Web Chat は ImageEmojis などのゲーム側絵文字プラグインを直接呼び出さず、リソースパックや生成済み glyph も読み取りません。トークン文字列を保持し、可能であれば ImageEmojis より先に読み込まれることで、ゲーム側レンダリング前の元のチャット文字列を取得できるようにします。

トークン保持動作が有効で同じ行に URL も含まれる場合、BM Web Chat は URL 参照行を繰り返さず、単一の plain Minecraft チャット行として送信します。これにより、ゲーム側の絵文字プラグインが元のトークン文字列を読み取れます。

`default-pack` と `aliases` は、flat なゲーム側トークンを BM Web Chat の pack/name id に対応付けるために使います。例:

```yaml
emoji:
  game-link:
    default-pack: "default"
    aliases:
      wave: "default/wave"
```

GIF/JPG/JPEG/WEBP 絵文字の元ファイルには、PNG のみを読むゲーム側絵文字プラグインとの互換性のため、同じフォルダーに PNG sidecar が自動生成されます。Web UI は元ファイルを使い続けるため、GIF アニメーションは維持されます。

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


## ブラウザー通知と Web Push

`browser-notifications` は、Web ページを開いている間に表示する OS レベルのブラウザー通知を制御します。ユーザーはブラウザー側で通知権限を許可する必要があります。`notify-*` 値はサーバー側の許可上限です。`true` の場合は各ユーザー/ブラウザーがチャット設定で切り替えられ、`false` の場合はユーザーが有効化してもその通知種別はブロックされます。`notify-keywords` はユーザー定義のキーワード通知を制御します。キーワード一覧はブラウザー/端末ごとに保存され、バックグラウンド判定のためその端末の Web Push 購読にのみ同期されます。

`web-push` はHTTPS または localhost、通知権限、Service Worker / Push API 対応がそろうと、バックグラウンド/モバイルプッシュ通知を送信できます。Android/desktop ブラウザーでは、現在の origin が Service Worker + Push API に対応していれば BlueMap addon と standalone ページのどちらからでも Push を有効化できます。iOS/iPadOS の通常のブラウザータブは Web Push に対応していないため、ホーム画面に追加して Web アプリとして開いたページでのみ試してください。未対応の挙動はプラットフォーム制限として扱います。`web-push` の `notify-*` 値もプッシュ配信のサーバー側許可上限です。`web-push.enabled: true` で VAPID キーが空の場合、プラグインは `web-push-vapid.properties` に永続キーを生成します。`web-push.subject` は `mailto:admin@example.com` または `https://map.example.com` のような実在する連絡先/運用者識別用の VAPID URI にしてください。任意の文字列は推奨されず、一部の push サービスで拒否または低信頼として扱われる可能性があります。モバイルの「スパムの可能性」などの警告はブラウザー/OS が表示するため、プラグインから無効化できません。安定した HTTPS ドメイン、意味のある通知タイトル/本文、控えめな通知フィルター、連続したテスト通知を避けることで発生しにくくできます。

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

## メッセージ検索

保存履歴が有効な場合、チャットパネル右上のフローティング領域の虫眼鏡ボタンと `/history/search` API でメッセージ本文と送信者を検索できます。検索オプションでは日付/時刻範囲、送信者、ソース、システム/イベントの含有を指定できます。検索結果はスクロール可能な一覧で表示され、チャットのテーマとフォント設定に従います。検索結果をクリックすると、既存の周辺履歴読み込みで該当メッセージへ移動します。i18n キー付きのシステム／イベントメッセージは、可能な場合は要求された Web UI 言語で検索・表示されます。 検索は `search.enabled` で有効/無効を切り替えられ、`search.result-limit` だけで Web UI の結果数と `/history/search` API の上限を制御します。別の内部最大値はなく、2000 に設定すれば最大 2000 件、10 に設定すれば最大 10 件を返します。10000 や 100000 のような非常に大きい値も受け付けますが、検索速度の低下、応答サイズの増加、CPU・メモリ・DB 負荷の増加につながる可能性があります。既定値は 50 で、通常利用では 50〜200 を推奨します。既存の config.yml にはこれらの項目を手動で追加するか、既定設定とマージしてください。

## グループチャット

`group-chat.enabled` はWebグループチャット機能を有効にします。公開/非公開ルーム、ハッシュ保存される任意パスワード、招待、退出、ルームの非表示/再表示、ルーム設定、未読追跡、ユーザー別メッセージ非表示、メンバーのキック/ban/ban解除、所有者移譲に対応します。グループメッセージは `group-chat.sqlite-file`（既定値 `group-messages.db`）に保存されます。`group-chat.retention-days: 0` は期間整理なし、正の値は古いグループメッセージを物理削除します。


## 非公開チャットメタデータ・スーパー管理者

`private-chat-super-admins: []` には、管理/容量確認用にDM/グループチャットのメタデータを表示できる正確なUUIDまたはMinecraft名を指定します。この表示では参加者/タイトル、メッセージ数、おおよその保存サイズ、保存期限状態、メタデータセッション削除などの管理操作のみを提供し、本文は表示しません。


`standalone-web.app-name` と `standalone-web.app-short-name` は standalone ページ/PWA 名を制御します。モバイルでホーム画面 Web アプリとして追加済みの場合、変更後は再追加してください。`web-push.notification-title` はテスト/システム/バックグラウンド Push の既定タイトルを制御します。空の場合は `standalone-web.app-name` を使用します。
