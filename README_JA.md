# BlueMapWebChat

Bukkit/Paper/Spigot 系サーバー向けの Web チャットプラグインです。BlueMap の Web アドオンとして表示することも、BlueMap なしで standalone `/chat` ページとして使うこともできます。

## 主な機能

- BlueMap 内チャットパネル、または standalone Web チャットページ
- ゲーム ↔ Web チャット双方向連携
- ゲストチャット、計算 captcha、クールダウン、分間制限
- `/bmchat auth <code>` によるアカウント連携、Web パスワードログイン、ローカル管理者
- Web 管理/モデレーターパネル、メッセージ非表示、ゲスト/IP ミュート、セッション revoke
- ファイル/クリップボードアップロード、画像/動画/音声/YouTube プレビュー
- DiscordSRV 連携、Discord CDN メディアキャッシュ
- ピン留め、仮想スクロール、移動/リサイズ可能なウィンドウ、実験的 PIP
- UI 言語: en-US, ko-KR, ja-JP, zh-CN


## メディアプレビューの高さとスクロール安定性

推奨されるメディアプレビュー最大高さは `640-720px` です。デフォルトは `ui.image-preview-max-height: 720` です。

virtual scroll を使う場合、この制限を有効にしておくのが最も安定します。値を `0` にすると高さ制限なしになりますが、非常に大きい画像/GIF/動画/iframe プレビューは、メディアの読み込み完了時にスクロールジャンプを起こすことがあります。特にメディアの多い長いチャット履歴で発生しやすくなります。

```yaml
ui:
  image-preview-max-height: 720
```

## ビルド

```bash
mvn clean package
```

```text
target/BlueMapWebChat-3.0.0.jar
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

## HTTPS / リバースプロキシ推奨構成

公開サーバーでは、BlueMap と BlueMapWebChat を内部 HTTP サービスにし、HTTPS リバースプロキシの後ろに置くことを推奨します。

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

Caddy は `docs/CADDY_HTTPS_JA.md`、nginx は `docs/NGINX_HTTPS_JA.md` を参照してください。

## よく使う設定

- `ui.language`: `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `ui.image-preview-max-height`: 推奨 `640-720`; `0` は無制限で、メディアの多い virtual scroll ではスクロールジャンプが起こる場合があります
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: `false` の場合、実際のチャット送信者名に Minecraft legacy 色コードをレンダリングします。system/event 行は常に色コードを削除します。
- `commands.enabled`: Web コマンドパネル
- `commands.allow-all`: 任意のコンソールコマンドを許可
- `commands.run-from-chat-input`: 通常入力欄から `/command` を実行
- `ui.picture-in-picture.enabled`: PIP ボタンと PIP 実行を制御

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
- `docs/NGINX_HTTPS_JA.md`
- `docs/I18N_JA.md`
- `docs/INSTALL_TROUBLESHOOTING_JA.md`
- `docs/UPLOAD_SECURITY_JA.md`
- `docs/RELEASE_CHECKLIST_JA.md`
- `docs/STANDALONE_REVIEW_JA.md`
- `docs/OPERATIONS_SECURITY_JA.md`

フォント補足: インストール済みフォントは CSS の font-family 名で入力する必要があります。チャット設定の確認ボタンで、権限要求なしに現在のブラウザーで利用できそうか推定できます。
チャット設定では本文の文字色と UI 文字/記号色を別々に調整できます。UI 色は権限表示、Web/Game 送信元表示、時刻、プレースホルダー、アップロード/コマンドボタン、ピン留めラベルに適用されます。
折りたたまれた固定メッセージの文字も、設定したチャットフォントとメッセージ文字サイズに従います。サーバー announcement や Web コマンド結果などの組み込みシステムメッセージは、i18n キーがある場合、言語ファイルで翻訳されます。
