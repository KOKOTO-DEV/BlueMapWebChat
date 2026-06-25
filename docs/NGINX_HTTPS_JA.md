# BlueMapWebChat nginx HTTPS 設定ガイド

このガイドでは、BlueMap と BlueMapWebChat をローカル HTTP サービスとして動かしたまま、nginx で HTTPS 公開する構成を説明します。

## 推奨構成

```text
ユーザーのブラウザー
  ↓ HTTPS
nginx :443
  ├─ /           -> BlueMap Web サーバー、通常 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API とスタンドアロンページ、通常 127.0.0.1:8899
      /bmwc/api  -> 内部 /api
      /bmwc/chat -> 内部 /chat
```

ブラウザー側は `https://map.example.com/`、`https://map.example.com/bmwc/api/config`、`https://map.example.com/bmwc/chat` のように同じ公開 origin を使います。

## 1. nginx と Certbot のインストール

nginx は証明書を自動発行しません。公開 HTTPS 構成では nginx と Certbot をインストールし、ドメイン用の Let's Encrypt 証明書を取得します。

### Debian / Ubuntu の例

```bash
sudo apt update
sudo apt install -y nginx snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

証明書を取得する前に HTTP/HTTPS を許可します。

```bash
sudo ufw allow 'Nginx Full'
```

nginx プラグインで証明書を取得して適用します。

```bash
sudo certbot --nginx -d map.example.com
```

更新テスト:

```bash
sudo certbot renew --dry-run
```

環境によっては `sudo apt install certbot python3-certbot-nginx` も利用できますが、Certbot 公式手順では snap 方式が案内されることが多いです。

## 2. nginx 設定例

`examples/nginx/bluemapwebchat.conf` をコピーして、ドメイン名と証明書パスを変更してください。

```nginx
server {
    listen 80;
    server_name map.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name map.example.com;

    ssl_certificate     /etc/letsencrypt/live/map.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/map.example.com/privkey.pem;

    location /bmwc/ {
        proxy_pass http://127.0.0.1:8899/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
    }

    location / {
        proxy_pass http://127.0.0.1:8100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

`proxy_pass http://127.0.0.1:8899/;` の末尾スラッシュは意図したものです。`/bmwc/` を取り除き、`/bmwc/api/config` を `/api/config` として、`/bmwc/chat` を `/chat` として転送します。

SSE(Server-Sent Events) のため、`proxy_buffering off` は重要です。この設定がないと、チャット更新や再接続が nginx のバッファリングで遅れる場合があります。

手動で server block を配置する場合:

```bash
sudo cp examples/nginx/bluemapwebchat.conf /etc/nginx/sites-available/bluemapwebchat.conf
sudo ln -sf /etc/nginx/sites-available/bluemapwebchat.conf /etc/nginx/sites-enabled/bluemapwebchat.conf
sudo nginx -t
sudo systemctl reload nginx
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

nginx と Minecraft が同じホストにある場合、BlueMapWebChat API は `127.0.0.1` のみに bind するのがおすすめです。

## 5. 適用手順

1. ドメインの A/AAAA レコードをサーバー IP に向けます。
2. ファイアウォールで `80/tcp` と `443/tcp` を許可します。
3. nginx と Certbot をインストールします。
4. `sudo certbot --nginx -d map.example.com` で証明書を取得するか、証明書を手動配置します。
5. nginx 設定を適用し、`sudo nginx -t` が成功することを確認します。
6. `web-addon.api-base-url` を `/bmwc/api` に設定します。
7. スタンドアロンページを `https://map.example.com/bmwc/chat` で開く場合、`standalone-web.api-base-url` は空のままでも、`web-addon.api-base-url` と同じ `/bmwc/api` を指定しても構いません。
8. アップロード/絵文字の公開 URL は通常空にします。従来の明示設定が必要な場合、`upload.public-base-url` は `/bmwc/api` または `/bmwc/api/uploads`、`emoji.public-base-url` は `/bmwc/api` または `/bmwc/api/emojis` を使用できます。
9. `/bmchat reload` またはサーバー再起動で Web addon ファイルを再生成します。
10. BlueMap が自動で Web アセットを更新しない場合は `/bluemap reload` を実行します。
11. ブラウザーで `https://map.example.com/` または `https://map.example.com/bmwc/chat` を開きます。

## 6. HTTP ページ + HTTPS API の注意

BlueMap ページを HTTP のまま配信し、チャット API だけ HTTPS にする構成は完全なセキュリティ境界ではありません。公開サーバーでは BlueMap と BlueMapWebChat の両方を同じ HTTPS origin で配信してください。

### URL 設定の解決規則

`web-addon.api-base-url` が HTTPS 公開 API 経路の基準です。`standalone-web.api-base-url`、`upload.public-base-url`、`emoji.public-base-url` は互換目的がなければ空のままにします。standalone の空値は `web-addon.api-base-url` を使い、upload/emoji の空値は `/uploads` と `/emojis` を追加します。`/bmwc/api` のような絶対ブラウザパスはそのまま使います。先頭 `/` のない相対値は `http.cors-origin` が実際の origin のときその origin に対して解決されます。`https://...` の完全 URL はそのまま使います。
