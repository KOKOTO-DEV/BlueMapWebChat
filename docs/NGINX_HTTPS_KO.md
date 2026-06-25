# BlueMapWebChat nginx HTTPS 구성 가이드

이 가이드는 BlueMap과 BlueMapWebChat을 로컬 HTTP 서비스로 유지하고, nginx를 통해 HTTPS로 공개하는 방법을 설명합니다.

## 권장 구조

```text
사용자 브라우저
  ↓ HTTPS
nginx :443
  ├─ /           -> BlueMap 웹 서버, 보통 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API 및 독립 페이지, 보통 127.0.0.1:8899
      /bmwc/api  -> 내부 /api
      /bmwc/chat -> 내부 /chat
```

브라우저는 하나의 공개 origin만 사용해야 합니다. 예: `https://map.example.com/`, `https://map.example.com/bmwc/api/config`, `https://map.example.com/bmwc/chat`

## 1. nginx와 Certbot 설치

nginx는 인증서를 자체 발급하지 않습니다. 공개 HTTPS 구성에서는 nginx와 Certbot을 설치한 뒤, 도메인용 Let's Encrypt 인증서를 발급해야 합니다.

### Debian / Ubuntu 예시

```bash
sudo apt update
sudo apt install -y nginx snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

인증서 발급 전에 HTTP/HTTPS를 허용합니다.

```bash
sudo ufw allow 'Nginx Full'
```

nginx 플러그인으로 인증서를 발급하고 nginx 설정에 적용합니다.

```bash
sudo certbot --nginx -d map.example.com
```

자동 갱신 테스트:

```bash
sudo certbot renew --dry-run
```

배포판 패키지를 사용할 수 있는 환경에서는 `sudo apt install certbot python3-certbot-nginx` 방식도 가능하지만, Certbot 공식 안내는 대체로 snap 설치를 우선 안내합니다.

## 2. nginx 설정 예시

`examples/nginx/bluemapwebchat.conf`를 복사한 뒤 도메인과 인증서 경로를 바꾸세요.

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

`proxy_pass http://127.0.0.1:8899/;` 끝의 슬래시는 의도된 것입니다. `/bmwc/`를 제거해서 플러그인에는 `/bmwc/api/config`가 `/api/config`로, `/bmwc/chat`이 `/chat`으로 전달됩니다.

`proxy_buffering off`는 SSE(Server-Sent Events)에 중요합니다. 이 설정이 없으면 채팅 갱신이나 재연결 동작이 nginx 버퍼링 때문에 늦어질 수 있습니다.

Certbot이 자동으로 nginx 설정을 수정하게 하지 않고 직접 적용한다면:

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
  # 선택 사항입니다. web-addon.api-base-url과 같은 값을 넣어도 됩니다.
  api-base-url: "/bmwc/api"

upload:
  # 권장값은 빈 값입니다. 필요하면 "/bmwc/api" 또는 "/bmwc/api/uploads"도 사용 가능합니다.
  public-base-url: ""

emoji:
  # 권장값은 빈 값입니다. 필요하면 "/bmwc/api" 또는 "/bmwc/api/emojis"도 사용 가능합니다.
  public-base-url: ""

ui:
  image-preview-max-height: 720
```

`map.example.com`은 실제 도메인으로 바꾸세요.

스크롤 안정성을 위해 미디어 미리보기 max-height 제한을 유지하는 것을 권장합니다. 권장값은 `640-720`입니다. `0`은 무제한이며 미디어가 많은 virtual scroll에서 스크롤 튐이 발생할 수 있습니다.

## 4. 방화벽 권장값

```text
인터넷에서 허용: 80/tcp, 443/tcp
인터넷에서 차단: 8100/tcp, 8899/tcp
```

nginx와 Minecraft가 같은 호스트에 있으면 API는 `127.0.0.1`에만 바인딩하는 것이 좋습니다. 다른 호스트나 컨테이너에서 실행한다면 적절한 사설 주소를 사용하세요.

## 5. 적용 순서

1. 도메인 A/AAAA 레코드를 서버 IP로 지정합니다.
2. 방화벽에서 `80/tcp`, `443/tcp`를 허용합니다.
3. nginx와 Certbot을 설치합니다.
4. `sudo certbot --nginx -d map.example.com`으로 인증서를 발급하거나 직접 인증서를 배치합니다.
5. nginx 설정을 적용하고 `sudo nginx -t`가 성공하는지 확인합니다.
6. `web-addon.api-base-url`을 `/bmwc/api`로 설정합니다.
7. 독립 페이지를 `https://map.example.com/bmwc/chat`으로 열 때 `standalone-web.api-base-url`은 비워두거나 `web-addon.api-base-url`과 같은 `/bmwc/api`로 설정할 수 있습니다.
8. 업로드/이모지 공개 URL은 보통 비워둡니다. 별도 공개 경로로 서빙할 때만 설정하고, 기존 명시 방식인 `/bmwc/api/uploads`, `/bmwc/api/emojis`도 사용할 수 있습니다.
9. `/bmchat reload` 또는 서버 재시작으로 웹 애드온 파일을 다시 생성합니다.
10. BlueMap이 자동 갱신하지 않으면 `/bluemap reload`를 실행합니다.
11. 브라우저에서 `https://map.example.com/` 또는 `https://map.example.com/bmwc/chat`을 엽니다.

## 6. HTTP 페이지 + HTTPS API 주의

BlueMap 페이지를 HTTP로 제공하고 채팅 API만 HTTPS로 사용하는 구성은 완전한 보안 경계가 아닙니다. 페이지나 `chat.js`가 HTTP로 전달되면 네트워크 공격자가 스크립트를 바꿀 수 있습니다.

공개 서버에서는 BlueMap과 BlueMapWebChat을 같은 HTTPS origin에서 제공하세요.

### URL 설정 해석 규칙

`web-addon.api-base-url`이 HTTPS 공개 API 경로의 기준입니다. `standalone-web.api-base-url`, `upload.public-base-url`, `emoji.public-base-url`은 호환 목적이 아니면 비워둡니다. standalone 빈 값은 `web-addon.api-base-url`을 따르고, upload/emoji 빈 값은 각각 `/uploads`, `/emojis`를 붙입니다. `/bmwc/api` 같은 절대 브라우저 경로는 그대로 사용합니다. 선행 `/`가 없는 상대값은 `http.cors-origin`이 실제 origin일 때 그 origin을 앞에 붙입니다. `https://...` 전체 URL은 그대로 사용합니다.
