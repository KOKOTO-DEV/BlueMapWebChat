# BlueMapWebChat Caddy HTTPS 구성 가이드

이 가이드는 BlueMap과 BlueMapWebChat을 로컬 HTTP 서비스로 유지하고, Caddy를 통해 HTTPS로 공개하는 방법을 설명합니다.

## 권장 구조

```text
사용자 브라우저
  ↓ HTTPS
Caddy :443
  ├─ /           -> BlueMap 웹 서버, 보통 127.0.0.1:8100
  └─ /bmwc/*     -> BlueMapWebChat API 및 독립 페이지, 보통 127.0.0.1:8899
      /bmwc/api  -> 내부 /api
      /bmwc/chat -> 내부 /chat
```

브라우저는 하나의 공개 origin만 사용해야 합니다.

```text
https://map.example.com/
https://map.example.com/bmwc/api/config
https://map.example.com/bmwc/chat
```

내부 서비스는 기존 HTTP 포트 그대로 유지해도 됩니다.

## 1. Caddy 설치

Caddy는 도메인이 서버를 향하고 있고 `80/tcp`, `443/tcp`가 열려 있으면 보통 Let's Encrypt 인증서를 자동 발급/갱신합니다.

### Debian / Ubuntu 예시

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

### Fedora / RHEL 계열 예시

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install -y caddy
```

### Arch Linux 예시

```bash
sudo pacman -S caddy
```

## 2. Caddyfile 예시

`examples/caddy/Caddyfile`을 복사한 뒤 도메인을 바꾸세요.

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

`handle_path /bmwc/*`는 `/bmwc`를 제거하므로 `/bmwc/api/config` 요청은 플러그인에는 `/api/config`로, `/bmwc/chat` 요청은 `/chat`으로 전달됩니다.

적용 예시:

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

## 4. BlueMap

BlueMap은 기존 웹 포트, 보통 `8100`을 계속 사용해도 됩니다. 공개 환경에서는 인터넷에 Caddy의 `80/tcp`, `443/tcp`만 열고 BlueMap과 BlueMapWebChat은 내부 포트로 유지하는 구성이 좋습니다.

## 5. 방화벽 권장값

```text
인터넷에서 허용: 80/tcp, 443/tcp
인터넷에서 차단: 8100/tcp, 8899/tcp
```

내부적으로 Caddy가 `127.0.0.1:8100`, `127.0.0.1:8899`에 접속합니다.

## 6. 적용 순서

1. 도메인 A/AAAA 레코드를 서버 IP로 지정합니다.
2. 방화벽에서 `80/tcp`, `443/tcp`를 허용합니다.
3. Caddy를 설치합니다.
4. Caddyfile을 복사하고 reload합니다.
5. `web-addon.api-base-url`을 `/bmwc/api`로 설정합니다.
6. 독립 페이지를 `https://map.example.com/bmwc/chat`으로 열 때 `standalone-web.api-base-url`은 비워두거나 `web-addon.api-base-url`과 같은 `/bmwc/api`로 설정할 수 있습니다.
7. 업로드/이모지 공개 URL은 보통 비워둡니다. 별도 공개 경로로 서빙할 때만 설정하고, 기존 명시 방식인 `/bmwc/api/uploads`, `/bmwc/api/emojis`도 사용할 수 있습니다.
8. `/bmchat reload` 또는 서버 재시작으로 웹 애드온 파일을 다시 생성합니다.
9. BlueMap이 자동 갱신하지 않으면 `/bluemap reload`를 실행합니다.
10. 브라우저에서 `https://map.example.com/` 또는 `https://map.example.com/bmwc/chat`을 엽니다.

## 7. HTTP 페이지 + HTTPS API 주의

BlueMap 페이지를 HTTP로 제공하고 채팅 API만 HTTPS로 사용하는 구성은 완전한 보안 경계가 아닙니다. 페이지나 `chat.js`가 HTTP로 전달되면 네트워크 공격자가 스크립트를 바꿀 수 있습니다.

공개 서버에서는 BlueMap과 BlueMapWebChat을 같은 HTTPS origin에서 제공하세요.

## nginx 대안

Caddy 대신 nginx를 사용한다면 `docs/NGINX_HTTPS_KO.md`와 `examples/nginx/bluemapwebchat.conf`를 참고하세요.

### URL 설정 해석 규칙

`web-addon.api-base-url`이 HTTPS 공개 API 경로의 기준입니다. `standalone-web.api-base-url`, `upload.public-base-url`, `emoji.public-base-url`은 호환 목적이 아니면 비워둡니다. standalone 빈 값은 `web-addon.api-base-url`을 따르고, upload/emoji 빈 값은 각각 `/uploads`, `/emojis`를 붙입니다. `/bmwc/api` 같은 절대 브라우저 경로는 그대로 사용합니다. 선행 `/`가 없는 상대값은 `http.cors-origin`이 실제 origin일 때 그 origin을 앞에 붙입니다. `https://...` 전체 URL은 그대로 사용합니다.
