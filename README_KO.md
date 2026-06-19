# BlueMapWebChat

Bukkit/Paper/Spigot 계열 서버에서 동작하는 웹 채팅 플러그인입니다. BlueMap 웹 애드온으로 띄울 수도 있고, BlueMap 없이 플러그인이 제공하는 standalone 채팅 페이지만 사용할 수도 있습니다.

## 주요 기능

- BlueMap 지도 안 채팅 패널 또는 standalone `/chat` 페이지 제공
- 게임 ↔ 웹 채팅 양방향 전달
- 게스트 채팅, 수학 캡차, 쿨다운/분당 제한
- `/bmchat auth <code>` 계정 연동, 웹 비밀번호 로그인, 로컬 관리자 계정
- 관리자/모더레이터 웹 패널, 메시지 숨김, 고정/삭제 표시 토글, 게스트/IP 뮤트, 세션 revoke
- 파일/클립보드 업로드, 이미지/영상/오디오/YouTube 미리보기
- DiscordSRV 연동, Discord CDN 미디어 캐시
- 고정 메시지, 가상 스크롤, 창 이동/크기조절, PIP 실험 기능
- en-US, ko-KR, ja-JP, zh-CN 다국어 UI


## 미디어 미리보기 높이와 스크롤 안정성

권장 미디어 미리보기 최대 높이는 `640-720px`입니다. 기본값은 `ui.image-preview-max-height: 720`입니다.

이 제한을 유지하는 것이 virtual scroll 사용 시 가장 안정적입니다. 값을 `0`으로 설정하면 높이 제한이 없어지지만, 매우 큰 이미지/GIF/비디오/iframe 미리보기는 미디어 로딩 완료 시점에 스크롤 튐을 유발할 수 있습니다. 특히 미디어가 많은 긴 채팅 기록에서 더 잘 발생합니다.

```yaml
ui:
  image-preview-max-height: 720
```

## 빌드

```bash
mvn clean package
```

```text
target/BlueMapWebChat-3.0.0.jar
```

## 기본 설치

1. jar 파일을 `plugins/`에 넣습니다.
2. 서버를 한 번 실행해서 `plugins/BlueMapWebChat/config.yml`을 생성합니다.
3. BlueMap 안에 띄울 경우 `web-addon.auto-install`과 `web-addon.auto-patch-webapp-conf`를 `true`로 둡니다.
4. standalone만 쓸 경우 `standalone-web.enabled: true`, `web-addon.auto-install: false`, `web-addon.auto-patch-webapp-conf: false`로 둡니다.
5. 서버 재시작 또는 `/bmchat reload`를 실행합니다. BlueMap 쪽 웹 자원이 갱신되지 않으면 `/bluemap reload`도 실행합니다.

## 사용 형태

### BlueMap 애드온 + standalone 동시 사용

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: true
  auto-patch-webapp-conf: true
```

### standalone 전용

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```

standalone URL:

```text
http://<server-host>:8899/chat
```

## HTTPS / 리버스 프록시 권장 구성

공개 운영에서는 HTTP API를 직접 외부에 열지 말고, BlueMap과 BlueMapWebChat을 내부 HTTP로 두고 HTTPS 리버스 프록시 뒤에 두는 구성을 권장합니다.

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

예시 경로:

```text
https://map.example.com/          # BlueMap
https://map.example.com/bmwc/api  # BlueMapWebChat API
https://map.example.com/bmwc/chat # standalone 채팅
```

Caddy는 `docs/CADDY_HTTPS_KO.md`, nginx는 `docs/NGINX_HTTPS_KO.md`를 참고하세요.

## 자주 쓰는 설정

- `ui.language`: 기본 UI 언어. `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `ui.image-preview-max-height`: 권장 `640-720`; `0`은 무제한이며 미디어가 많은 virtual scroll에서 스크롤 튐이 발생할 수 있습니다
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: `false`면 실제 채팅 작성자 이름에 Minecraft legacy 색상 코드를 렌더링합니다. 시스템/event 메시지는 항상 색상 코드를 제거합니다.
- `commands.enabled`: 웹 명령어 패널 사용 여부
- `commands.allow-all`: 프리셋 외 임의 콘솔 명령어 허용 여부
- `commands.run-from-chat-input`: 채팅 입력창의 `/command` 실행 허용 여부
- `ui.picture-in-picture.enabled`: PIP 버튼과 PIP 실행을 함께 제어합니다.

## 명령어

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

## 권한

```text
bluemapwebchat.auth
bluemapwebchat.webchat
bluemapwebchat.admin
```

## 문서

- `docs/CONFIGURATION_KO.md` - 설정 참고
- `docs/CADDY_HTTPS_KO.md` - Caddy HTTPS 리버스 프록시
- `docs/NGINX_HTTPS_KO.md` - nginx HTTPS 리버스 프록시
- `docs/I18N_KO.md` - 다국어 파일과 fallback
- `docs/INSTALL_TROUBLESHOOTING_KO.md` - 설치/업그레이드/문제 해결
- `docs/UPLOAD_SECURITY_KO.md` - 업로드 보안
- `docs/RELEASE_CHECKLIST_KO.md` - 릴리스 체크리스트
- `docs/STANDALONE_REVIEW_KO.md` - BlueMap 의존성/standalone 모드 점검
- `docs/OPERATIONS_SECURITY_KO.md` - 공개 운영, trusted proxy 로그, 보안 체크리스트

## 주의

HTTP 전용 사용은 개인/테스트 용도로만 권장합니다. 비밀번호는 서버에 해시로 저장되지만, HTTP 로그인 트래픽 자체는 암호화되지 않습니다. 공개 운영에서는 HTTPS를 사용하세요.

폰트 참고: 설치된 글꼴은 CSS font-family 이름으로 입력해야 합니다. 채팅 설정의 확인 버튼으로 권한 요청 없이 현재 브라우저에서 해당 이름이 적용 가능한지 추정할 수 있습니다.
채팅 설정에서는 메시지 본문 글자색과 UI 글자/기호 색을 따로 조정할 수 있습니다. UI 색상은 권한 표시, 웹/게임 출처 표시, 시간, 입력창 placeholder, 업로드/명령 버튼, 고정 메시지 라벨에 적용됩니다.
접혀 있는 고정 메시지 문구도 설정한 채팅 폰트와 메시지 글자 크기를 따릅니다. 서버 announcement와 웹 명령어 결과 같은 내장 시스템 메시지는 i18n 키가 있으면 언어 파일 기준으로 번역됩니다.
