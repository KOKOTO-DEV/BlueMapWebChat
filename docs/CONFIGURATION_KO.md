# BlueMapWebChat 설정 참고

`plugins/BlueMapWebChat/config.yml` 기준 설명입니다.

## 배포 모드

### BlueMap 애드온

```yaml
web-addon:
  auto-install: true
  auto-patch-webapp-conf: true
```

BlueMap webroot 아래 `addons/bluemap-web-chat`에 파일을 설치하고 `webapp.conf`에 script/style 항목을 추가합니다.

### standalone 전용

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```

`http://<server-host>:8899/chat`로 접속합니다.

### HTTPS reverse proxy

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


## UI 타임존

`ui.time-zone`은 채팅 시간 표시 타임존을 지정합니다. `local`은 브라우저/기기 로컬 타임존을 사용하고, `UTC` 또는 `Asia/Seoul` 같은 IANA 타임존을 지정할 수 있습니다. 잘못된 값은 웹 UI에서 로컬 시간으로 fallback됩니다.

## 0 = 무제한/제한 없음인 옵션

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

## 고정 메시지

`pinned.show-to-logged-out`는 웹 로그인 전에도 고정 메시지를 보여줄지 제어합니다. 고정 내용을 로그인 사용자에게만 보여주려면 `false`로 설정합니다.

## 고정/삭제 표시 토글

메시지별 고정/삭제 버튼은 실수 클릭을 막기 위해 기본적으로 숨겨져 있습니다. ADMIN/MOD 사용자는 관리자 패널의 웹 히스토리 비우기 버튼 옆에 있는 고정/삭제 활성화 토글을 켜서 버튼을 표시할 수 있습니다. 이 토글은 저장되지 않으며 새로고침하면 다시 꺼집니다.

## UI

```yaml
ui:
  language: "en-US"        # en-US, ko-KR, ja-JP, zh-CN
  language-fallback: "en-US"
  theme: "system"          # system, dark, light, high-contrast
  opacity: 0.92
```

사용자가 채팅 설정에서 바꾼 값은 브라우저 localStorage에 저장됩니다.

`ui.text-color`는 채팅 메시지 본문 글자색의 기본값입니다. `ui.ui-text-color`는 관리자/권한 표시, 웹/게임 출처 표시, 시간 표시, 입력창 placeholder, 업로드/명령 버튼, 고정 메시지 라벨 같은 UI 글자/기호 색의 기본값입니다. 비워두면 선택한 테마를 따릅니다. 사용자는 채팅 설정에서 브라우저별로 둘 다 덮어쓸 수 있습니다.

```yaml
ui:
  text-color: ""          # 메시지 본문 테마 기본값
  ui-text-color: ""       # UI 표시/기호 테마 기본값
  # text-color: "#f4f4f4"
  # ui-text-color: "#b8d8ff"
```

`ui.input-background-color`는 입력창 배경색을 전역으로 고정합니다. 비워두면 선택한 테마를 따릅니다. 사용자는 채팅 설정에서 브라우저별로 따로 덮어쓸 수도 있습니다.

```yaml
ui:
  input-background-color: ""      # 테마 기본값
  # input-background-color: "#1e1e24"
```

## 닉네임 표시

```yaml
player-display:
  mode: "name"             # name, display-name, custom-name
  strip-colors: true
```

`strip-colors: false`는 실제 채팅 작성자 이름에만 Minecraft legacy 색상 코드를 렌더링합니다. 서버 입장/퇴장/사망/업적 같은 system/event 메시지는 항상 색상 코드를 제거합니다.

## 명령어 패널

```yaml
commands:
  enabled: false
  allow-all: false
  min-role: ADMIN
  run-from-chat-input: false
  max-length: 0
```

`allow-all: true`는 웹에서 임의 콘솔 명령어를 실행할 수 있으므로 HTTPS와 강한 인증이 전제되어야 합니다. `run-from-chat-input: false`면 명령어 버튼/모달에서만 실행됩니다.


## 미디어 미리보기 높이와 스크롤 안정성

`ui.image-preview-max-height`는 이미지, GIF, 비디오, iframe 계열 미리보기의 표시 높이를 제한합니다. 권장 범위는 `640-720`이며 기본값은 `720`입니다.

```yaml
ui:
  image-preview-max-height: 720
```

값을 `0`으로 설정하면 높이 제한이 없어집니다. 단, 매우 큰 미디어 또는 무제한 미리보기는 미디어 로딩 완료 시점에 스크롤 튐을 유발할 수 있습니다. 특히 virtual scroll과 미디어가 많은 긴 채팅 기록을 함께 사용할 때 더 잘 발생합니다.


## 미리보기

```yaml
preview:
  youtube-click-to-load: true
  media-click-to-load: true
```

`false`로 두면 별도 로드 버튼 없이 플레이어/iframe을 바로 렌더링합니다. 자동 재생 여부는 브라우저 정책의 영향을 받습니다.

## PIP

```yaml
ui:
  picture-in-picture:
    enabled: false
```

이 하나의 옵션이 PIP 버튼 표시와 PIP 실행을 모두 제어합니다. 브라우저가 제공하는 URL/닫기 UI, OS 창 투명도, 외부 PIP 창 이동은 채팅 설정 제목이 아니라 브라우저/운영체제가 제어합니다.

## 로그인 실패 제한

`security.login-fail-limit`, `security.login-fail-window-seconds`, `security.login-lock-seconds`는 웹 비밀번호 로그인 반복 실패를 제한합니다. `login-fail-limit: 0`이면 제한을 끕니다. 이 설정은 웹 비밀번호 로그인에만 적용됩니다.
## 링크 코드 발급 제한

`auth.link-code-cooldown-seconds`와 `auth.link-code-max-per-minute`는 웹 UI에서 `/bmchat auth <code>`용 링크 코드를 원격 IP별로 얼마나 자주 발급할 수 있는지 제한합니다. 각 값을 `0`으로 두면 해당 제한을 끕니다.

## HTTP 프록시 / 클라이언트 IP

`http.trusted-proxies`는 `X-Forwarded-For`를 신뢰할 프록시를 지정합니다. 직접 HTTP로 공개할 때는 비워두세요. 같은 서버의 Caddy/Nginx 뒤에서 사용할 때는 `127.0.0.1`, `::1`을 블록형 YAML 목록으로 넣으세요. `http.log-client-ip-resolution: true`는 소켓 IP, forwarded 헤더, 최종 클라이언트 IP를 서버 콘솔과 `logs/latest.log`에 찍어 확인할 때만 임시로 사용하세요. 자세한 확인 방법은 `docs/OPERATIONS_SECURITY_KO.md`를 참고하세요.

## SSE 연결 수 제한

`security.max-sse-connections-per-ip`와 `security.max-sse-connections-total`은 오래 유지되는 `/stream` 연결 수를 제한합니다. 각 값은 `0`으로 두면 비활성화됩니다.

### 시스템 메시지 번역

내장 announcement와 웹 명령어 결과 메시지는 i18n 키를 포함합니다. `announcements.*.message`는 fallback/사용자 지정 문구로 유지하세요. 해당 키가 언어 파일에 있으면 사용자는 선택한 언어의 번역 문구를 보게 됩니다.

접혀 있는 고정 메시지 바의 글자도 설정한 채팅 폰트와 메시지 글자 크기를 따릅니다.
