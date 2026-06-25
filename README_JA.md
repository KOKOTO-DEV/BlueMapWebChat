# BlueMapWebChat

Bukkit/Paper/Spigot 系サーバー向けの Web チャットプラグインです。BlueMap の Web アドオンとして表示することも、BlueMap なしで standalone `/chat` ページとして使うこともできます。

## 主な機能

- BlueMap 内チャットパネル、または standalone Web チャットページ
- ゲーム ↔ Web チャット双方向連携
- ゲストチャット、計算 captcha、クールダウン、分間制限
- `/bmchat auth <code>` によるアカウント連携、Web パスワードログイン、ローカル管理者
- Web 管理/モデレーターパネル、メッセージ非表示、ゲスト/IP ミュート、セッション revoke
- 管理者向けカスタム絵文字管理: フォルダー/ファイルの作成、アップロード、名前変更、削除
- ファイル/クリップボードアップロード、画像/動画/音声/YouTube/Shorts プレビュー、任意の TikTok / X(Twitter) 埋め込み
- DiscordSRV 連携、Discord CDN メディアキャッシュ
- 返信と元メッセージへのジャンプ、ゲーム内返信プレビュー、ピン留め、仮想スクロール、移動/リサイズ可能なウィンドウ、実験的 PIP
- UI 言語: en-US, ko-KR, ja-JP, zh-CN

## ビルド

```bash
mvn clean package
```

```text
target/BlueMapWebChat-4.0.0.jar
```

## インストール

1. jar を `plugins/` に入れます。
2. サーバーを一度起動して `plugins/BlueMapWebChat/config.yml` を生成します。
3. BlueMap 埋め込みで使う場合は `web-addon.auto-install` と `web-addon.auto-patch-webapp-conf` を `true` のままにします。
4. standalone のみで使う場合は `standalone-web.enabled: true`, `web-addon.auto-install: false`, `web-addon.auto-patch-webapp-conf: false` にします。
5. サーバーを再起動するか `/bmchat reload` を実行します。BlueMap の Web アセットが更新されない場合は `/bluemap reload` も実行します。

## standalone の URL

```text
http://<server-host>:8899/chat
```

## HTTPS / Caddy 推奨構成

公開サーバーでは、BlueMap と BlueMapWebChat を内部 HTTP サービスにし、HTTPS リバースプロキシの後ろに置くことを推奨します。

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
  path: "/chat"
  # 任意です。web-addon.api-base-url と同じ経路を指定できます。
  api-base-url: "/bmwc/api"

upload:
  # 推奨は空です。アップロード URL は自動的に /bmwc/api に従います。
  # 従来の明示指定も使えます: "/bmwc/api" または "/bmwc/api/uploads"
  public-base-url: ""

emoji:
  # 推奨は空です。絵文字 URL は自動的に /bmwc/api に従います。
  # 従来の明示指定も使えます: "/bmwc/api" または "/bmwc/api/emojis"
  public-base-url: ""
  max-total-size-mb: 64
  show-storage-usage: true
  show-storage-limit: true
```

詳細は `docs/CADDY_HTTPS_JA.md` を参照してください。

## よく使う設定

- `ui.language`: `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: `false` の場合、実際のチャット送信者名に Minecraft legacy 色コードをレンダリングします。system/event 行は常に色コードを削除します。
- `commands.enabled`: Web コマンドパネル
- `commands.allow-all`: 任意のコンソールコマンドを許可
- `commands.run-from-chat-input`: 通常入力欄から `/command` を実行
- `ui.picture-in-picture.enabled`: PIP ボタンと PIP 実行を制御

## カスタム絵文字とゲーム側絵文字プラグイン

BlueMapWebChat はカスタム絵文字を `plugins/BlueMapWebChat/emojis` に保存します。サブフォルダーは絵文字パックとして扱われます。

Web→ゲームチャットでは、`emoji.game-link.mode` は `link` と `label` のみをサポートします。

- `link`: 設定されたトークン文字列と BM Web Chat の短い画像リンクを送信します。
- `label`: 設定されたトークン文字列だけを送信します。

BM Web Chat は ImageEmojis などのゲーム側絵文字プラグインを直接呼び出さず、リソースパックや生成済み glyph も読み取りません。外部のゲーム側絵文字プラグインが `:default/wave:` のような同じトークン文字列を使う場合、そのプラグインが Minecraft チャット内でレンダリングできます。`plain-broadcast-with-urls: true` の場合、カスタム絵文字トークンと URL が同じメッセージに含まれると行を分離します。元の行は plain として送信してゲーム側絵文字プラグインがトークンを描画できるようにし、各 URL は別のクリック可能な参照行として再送信します。

GIF/JPG/JPEG/WEBP の絵文字をアップロードすると、PNG だけを読めるゲーム側絵文字プラグインとの互換性のため、同じフォルダーに PNG sidecar も生成します。

```text
plugins/BlueMapWebChat/emojis/default/wave.gif
plugins/BlueMapWebChat/emojis/default/wave.png
```

Web UI は元ファイルを使うため、GIF アニメーションは維持されます。ゲーム側絵文字プラグインが同じ絵文字ディレクトリを監視している場合は PNG sidecar を利用できます。絵文字の追加や変更後は、そのプラグインの reload コマンドを実行してください。

## YouTube Shorts、TikTok、X/Twitter プレビュー

YouTube Shorts の URL は通常の YouTube プレビューとして処理され、縦型プレイヤーとループ再生を使い、既定で有効です。TikTok と X/Twitter は任意の social embed として提供され、ユーザーのブラウザーから外部コンテンツを読み込むため、既定では無効です。TikTok はチャット内で長い説明文や音楽情報による内部スクロールバーを避けるため、公式 `player/v1` iframe を使い、説明文/音楽情報を非表示にします。完全な情報は元の TikTok リンクから開けます。

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

TikTok または X/Twitter は、外部 embed リクエストを許可できるサーバーでのみ有効にすることを推奨します。公開サーバーでは `click-to-load: true` を維持し、ユーザーがプレビューを開いたときだけ外部コンテンツを読み込む設定が安全です。

## コマンド

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

## 権限

```text
bluemapwebchat.auth
bluemapwebchat.webchat
bluemapwebchat.admin
```

## ドキュメント

- `docs/CONFIGURATION_JA.md`
- `docs/CADDY_HTTPS_JA.md`
- `docs/I18N_JA.md`
- `docs/INSTALL_TROUBLESHOOTING_JA.md`
- `docs/UPLOAD_SECURITY_JA.md`
- `docs/RELEASE_CHECKLIST_JA.md`
- `docs/STANDALONE_REVIEW_JA.md`
- `docs/OPERATIONS_SECURITY_JA.md`

フォント補足: インストール済みフォントは CSS の font-family 名で入力する必要があります。チャット設定の確認ボタンで、権限要求なしに現在のブラウザーで利用できそうか推定できます。


URL 設定メモ: HTTPS リバースプロキシでは `web-addon.api-base-url` を `/bmwc/api` のような公開 API 経路に設定します。`standalone-web.api-base-url`、`upload.public-base-url`、`emoji.public-base-url` は通常空のままにします。空の場合、standalone は web-addon の API base を再利用し、upload/emoji は `/uploads` と `/emojis` を自動で付けます。`/bmwc/api`、`/bmwc/api/uploads`、`/bmwc/api/emojis` の明示指定も使用できます。先頭 `/` のない相対値は `http.cors-origin` が実際の origin のとき、その origin に対して解決されます。
