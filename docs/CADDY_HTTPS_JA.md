# BlueMapWebChat Caddy HTTPS 設定ガイド

このガイドでは、BlueMap と BlueMapWebChat をローカル HTTP サービスとして動かしたまま、Caddy で HTTPS 公開する構成を説明します。

## 推奨構成

```text
ユーザーのブラウザー
  ↓ HTTPS
Caddy :443
  ├─ /           -> BlueMap Web サーバー、通常 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API とスタンドアロンページ、通常 127.0.0.1:8899
      /bmwc/api  -> 内部 /api
      /bmwc/chat -> 内部 /chat
```

ブラウザー側は同じ公開 origin を使う構成を推奨します。

```text
https://map.example.com/
https://map.example.com/bmwc/api/config
https://map.example.com/bmwc/chat
```

## 1. Caddy のインストール

Caddy は、ドメインがサーバーを指しており `80/tcp` と `443/tcp` が到達可能であれば、通常 Let's Encrypt 証明書を自動で取得・更新します。

### Debian / Ubuntu の例

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### Fedora / RHEL 系の例

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install -y caddy
```

### Arch Linux の例

```bash
sudo pacman -S caddy
```

## 2. Caddyfile の例

`examples/caddy/Caddyfile` をコピーして、ドメイン名を変更してください。

```caddyfile
map.example.com {
  encode zstd gzip

  handle_path /bmwc/* {
    reverse_proxy 127.0.0.1:8899
  }

  handle {
    reverse_proxy 127.0.0.1:8100
  }
}
```

`handle_path /bmwc/*` は `/bmwc` を取り除くため、`/bmwc/api/config` はプラグイン側では `/api/config` として、`/bmwc/chat` は `/chat` として渡されます。

適用例:

```bash
sudo cp examples/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 3. BlueMapWebChat config.yml

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
  # 任意です。web-addon.api-base-url と同じ値で構いません。
  api-base-url: "/bmwc/api"

upload:
  # 推奨は空です。必要なら "/bmwc/api" または "/bmwc/api/uploads" も使えます。
  public-base-url: ""

emoji:
  # 推奨は空です。必要なら "/bmwc/api" または "/bmwc/api/emojis" も使えます。
  public-base-url: ""

ui:
  image-preview-max-height: 720
```

`map.example.com` は実際のドメインに置き換えてください。

スクロールの安定性のため、メディアプレビューの max-height 制限は有効にしておくことを推奨します。推奨値は `640-720` です。`0` は無制限で、メディアが多い virtual scroll ではスクロール位置が跳ねる場合があります。

## 4. ファイアウォール推奨設定

```text
インターネットから許可: 80/tcp, 443/tcp
インターネットから遮断: 8100/tcp, 8899/tcp
```

Caddy と Minecraft が同じホストにある場合、BlueMapWebChat API は `127.0.0.1` のみに bind するのがおすすめです。

## 5. 適用手順

1. ドメインの A/AAAA レコードをサーバー IP に向けます。
2. ファイアウォールで `80/tcp` と `443/tcp` を許可します。
3. Caddy をインストールします。
4. Caddyfile を配置し、Caddy を reload します。
5. `web-addon.api-base-url` を `/bmwc/api` に設定します。
6. スタンドアロンページを `https://map.example.com/bmwc/chat` で開く場合、`standalone-web.api-base-url` は空のままでも、`web-addon.api-base-url` と同じ `/bmwc/api` を指定しても構いません。
7. アップロード/絵文字の公開 URL は通常空にします。従来の明示設定が必要な場合、`upload.public-base-url` は `/bmwc/api` または `/bmwc/api/uploads`、`emoji.public-base-url` は `/bmwc/api` または `/bmwc/api/emojis` を使用できます。
8. `/bmchat reload` またはサーバー再起動で Web addon ファイルを再生成します。
9. BlueMap が自動で Web アセットを更新しない場合は `/bluemap reload` を実行します。
10. ブラウザーで `https://map.example.com/` または `https://map.example.com/bmwc/chat` を開きます。

## 6. HTTP ページ + HTTPS API の注意

BlueMap ページを HTTP のまま配信し、チャット API だけ HTTPS にする構成は完全なセキュリティ境界ではありません。公開サーバーでは BlueMap と BlueMapWebChat の両方を同じ HTTPS origin で配信してください。

## nginx を使う場合

nginx を使う場合は `docs/NGINX_HTTPS_JA.md` と `examples/nginx/bluemapwebchat.conf` を参照してください。

### URL 設定の解決規則

`web-addon.api-base-url` が HTTPS 公開 API 経路の基準です。`standalone-web.api-base-url`、`upload.public-base-url`、`emoji.public-base-url` は互換目的がなければ空のままにします。standalone の空値は `web-addon.api-base-url` を使い、upload/emoji の空値は `/uploads` と `/emojis` を追加します。`/bmwc/api` のような絶対ブラウザパスはそのまま使います。先頭 `/` のない相対値は `http.cors-origin` が実際の origin のときその origin に対して解決されます。`https://...` の完全 URL はそのまま使います。
