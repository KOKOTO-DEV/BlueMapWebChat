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
web-addon:
  auto-install: false
  auto-patch-webapp-conf: false

standalone-web:
  enabled: true
  path: "/chat"
```

`http://<server-host>:8899/chat`로 접속합니다.

### HTTPS reverse proxy

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
  # 권장값은 빈 값입니다. web-addon.api-base-url을 따라갑니다.
  # 같은 공개 API 경로를 명시하려면 "/bmwc/api"를 넣어도 됩니다.
  api-base-url: ""

upload:
  # 권장값은 빈 값입니다. 업로드 URL은 활성 API base를 자동으로 따라갑니다.
  # 기존 명시값도 동작합니다: "/bmwc/api" 또는 "/bmwc/api/uploads"
  public-base-url: ""

emoji:
  # 권장값은 빈 값입니다. 이모지 URL은 활성 API base를 자동으로 따라갑니다.
  # 기존 명시값도 동작합니다: "/bmwc/api" 또는 "/bmwc/api/emojis"
  public-base-url: ""
```

### 공개 URL 옵션 규칙

- `http.path-prefix`는 플러그인 내부 HTTP API 경로입니다. 기본값 `/api`는 그대로 둡니다.
- `web-addon.api-base-url`은 BlueMap 내장 채팅이 사용할 공개 API base입니다. HTTPS 리버스 프록시에서는 보통 `/bmwc/api`로 설정합니다.
- `standalone-web.api-base-url`은 보통 비워둡니다. 비워두면 `web-addon.api-base-url`을 재사용합니다. 예: `/bmwc/chat`은 `/bmwc/api`를 사용합니다. 필요하면 `/bmwc/api`처럼 같은 값을 명시해도 됩니다.
- `upload.public-base-url`은 보통 비워둡니다. 비워두면 활성 API base에 `/uploads`를 붙입니다. 예: `/bmwc/api/uploads`.
- `emoji.public-base-url`은 보통 비워둡니다. 비워두면 활성 API base에 `/emojis`를 붙입니다. 예: `/bmwc/api/emojis`.
- 명시값도 허용됩니다. `/bmwc/api`를 넣으면 upload는 `/uploads`, emoji는 `/emojis`를 자동으로 붙이고, `/bmwc/api/uploads`, `/bmwc/api/emojis`를 넣으면 그대로 사용합니다.
- 선행 `/`가 없는 상대값, 예: `bmwc/api`, `bmwc/api/uploads`, `bmwc/api/emojis`는 `http.cors-origin`이 실제 origin일 때 그 origin을 앞에 붙입니다. `cors-origin: "*"`이면 같은 origin 절대경로처럼 `/bmwc/api...`로 처리합니다.
- `https://map.example.com/bmwc/api` 같은 전체 URL은 그대로 사용합니다.

### 이모지 용량 표시

`emoji.max-total-size-mb`는 커스텀 이모지 전체 용량을 제한합니다. 제한을 초과하면 관리자 업로드 화면에서 경고가 표시됩니다. `emoji.show-storage-usage`는 현재 이모지 용량 표시 여부, `emoji.show-storage-limit`는 전체 용량 제한 표시 여부를 제어합니다.

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
- `preview.social-embeds.max-embeds-per-message`
- `preview.external-media-cache-max-size-mb`
- `pinned.max-pins`
- `pinned.show-to-logged-out`
- `commands.max-length`

## Minecraft 채팅 답글 표시

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

웹 또는 게스트 메시지가 다른 메시지에 답글을 달면 `game-preview.enabled`가 원문 미리보기를 실제 웹 메시지보다 먼저 Minecraft 채팅에 별도 한 줄로 보냅니다. 이렇게 하면 기존 웹→게임 채팅 포맷은 유지하면서, 원문 줄과 실제 메시지 줄의 URL을 각각 클릭 가능하게 유지할 수 있습니다.

원문 미리보기는 일반 웹 메시지와 같은 웹→게임 커스텀 이모지 경로를 사용합니다. 원문 안의 커스텀 이모지 토큰은 `emoji.game-link.label-format` 기준으로 포맷되고, 긴 원문은 `max-length` 기준으로 `…` 처리됩니다. `0`으로 두면 원문 미리보기 자체의 길이 제한을 끕니다.

`game-prefix`는 실제 답글 메시지 줄의 라벨/prefix를 제어합니다. 기본 웹 포맷에서는 `[Web] Player: message`를 `[Reply] Player: message`로 바꿉니다. BlueMapWebChat은 이미 렌더링된 전달 문자열의 앞부분에서 처음 나오는 대괄호 소스 라벨을 교체합니다. 대괄호 라벨이 없으면 prefix 텍스트를 앞에 붙입니다. 같은 답글 원문 미리보기와 라벨은 web-to-Discord 전달에도 적용됩니다.

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

## 커스텀 이모지와 게임 측 이모지 플러그인

BlueMapWebChat은 커스텀 이모지를 `plugins/BlueMapWebChat/emojis` 아래에 저장합니다. 하위 폴더는 이모지 팩으로 처리됩니다.

`emoji.game-link.mode`는 `link`와 `label`만 지원합니다.

- `link`: `label-format` 텍스트와 BM Web Chat 짧은 이미지 링크를 같이 보냅니다.
- `label`: `label-format` 텍스트만 보냅니다.

BM Web Chat은 ImageEmojis나 다른 게임 측 이모지 플러그인을 직접 호출하지 않고, 리소스팩이나 생성된 glyph도 읽지 않습니다. 외부 게임 측 이모지 플러그인이 같은 토큰 텍스트를 사용한다면 Minecraft 채팅에서 해당 토큰을 렌더링할 수 있습니다.

`plain-broadcast-with-urls`는 한 메시지에 커스텀 이모지 토큰과 URL이 같이 있을 때의 처리 방식을 정합니다. 기본값 `true`에서는 원문 줄을 plain Bukkit 채팅으로 보내 게임 측 이모지 플러그인이 토큰을 렌더링하게 하고, 각 URL은 별도의 클릭 가능한 참조 줄로 다시 보냅니다. 이모지가 URL 앞에 있든 뒤에 있든 동일하게 처리됩니다.

`default-pack`과 `aliases`는 짧은 게임 측 토큰을 BM Web Chat의 pack/name id로 매핑할 때 사용합니다. 예를 들면 다음과 같습니다.

```yaml
emoji:
  game-link:
    default-pack: "default"
    aliases:
      wave: "default/wave"
```

GIF/JPG/JPEG/WEBP 이모지 원본은 PNG만 읽는 게임 측 이모지 플러그인과의 호환을 위해 같은 폴더에 PNG sidecar가 자동 생성됩니다. 웹 UI는 원본 파일을 사용하므로 GIF 애니메이션은 유지됩니다.

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

YouTube Shorts는 일반 YouTube 미리보기 경로에서 처리됩니다. Shorts는 세로형 플레이어로 표시되고 YouTube loop 파라미터를 사용합니다.

TikTok과 X/Twitter는 사용자의 브라우저에서 외부 콘텐츠를 불러오므로 선택 기능입니다. 서버 정책상 외부 embed 요청을 허용할 때만 켜는 것을 권장합니다. 공개 서버에서는 `social-embeds.click-to-load: true`를 유지해서 사용자가 미리보기를 열 때만 외부 플레이어가 로드되게 하는 편이 안전합니다.

TikTok은 공식 `player/v1` iframe을 사용하고 `description=0`, `music_info=0`을 적용합니다. 이렇게 하면 게시물 본문/음악 정보 길이에 따라 채팅 패널 안에 내부 스크롤바가 생기는 문제를 피할 수 있습니다. 전체 게시물 정보는 플레이어 아래의 원문 TikTok 링크로 열 수 있습니다.

`youtube-click-to-load` 또는 `media-click-to-load`를 `false`로 두면 해당 미리보기를 즉시 렌더링합니다. 자동 재생 여부는 브라우저 정책의 영향을 받습니다.

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

### Text shadow / readability

- `ui.text-shadow-mode`: `none`, `auto`, `dark`, `light`, `custom` 중 하나입니다. 글자색/배경색 대비가 낮을 때 가독성을 보강합니다.
- `ui.text-shadow-custom`: 모드가 `custom`일 때 사용할 CSS `text-shadow` 값입니다. 채팅 설정 화면에서는 색상 선택기와 가로 위치, 세로 위치, 흐림, 불투명도 조절바로 편집하며, 저장값은 표준 CSS 형식으로 유지됩니다. 예: `0 1px 2px rgba(0, 0, 0, 0.85)`.

> 테마는 브라우저별 채팅 설정에서도 변경할 수 있습니다. 테마를 바꾸면 글자색/배경색/그림자 같은 시각 설정은 해당 테마의 기본값으로 초기화됩니다.


관리자 커스텀 이모지 참고: 이모지 파일명이나 폴더명을 변경하면 `:emoji:pack/name:` 토큰도 바뀝니다. 기존 토큰을 사용한 과거 채팅은 기존 파일/폴더명을 유지하지 않는 한 더 이상 렌더링되지 않을 수 있습니다.
