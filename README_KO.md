# BlueMapWebChat

Bukkit/Paper/Spigot 계열 서버에서 동작하는 웹 채팅 플러그인입니다. BlueMap 웹 애드온으로 띄울 수도 있고, BlueMap 없이 플러그인이 제공하는 standalone 채팅 페이지만 사용할 수도 있습니다.

## 주요 기능

- BlueMap 지도 안 채팅 패널 또는 standalone `/chat` 페이지 제공
- 게임 ↔ 웹 채팅 양방향 전달
- 게스트 채팅, 수학 캡차, 쿨다운/분당 제한
- `/bmchat auth <code>` 계정 연동, 웹 비밀번호 로그인, 로컬 관리자 계정
- 관리자/모더레이터 웹 패널, 메시지 숨김, 고정/삭제 표시 토글, 게스트/IP 뮤트, 세션 revoke
- 관리자 커스텀 이모지 관리: 이모지 폴더/파일 생성, 업로드, 이름 변경, 삭제
- 파일/클립보드 업로드, 이미지/영상/오디오/YouTube/Shorts 미리보기, 선택형 TikTok 및 X/Twitter 임베드
- DiscordSRV 연동, Discord CDN 미디어 캐시
- 답글 및 원본 메시지 점프, 게임 채팅 원문 미리보기, 고정 메시지, 가상 스크롤, 창 이동/크기조절, PIP 실험 기능
- en-US, ko-KR, ja-JP, zh-CN 다국어 UI

## 빌드

```bash
mvn clean package
```

```text
target/BlueMapWebChat-4.0.0.jar
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
web-addon:
  auto-install: true
  auto-patch-webapp-conf: true

standalone-web:
  enabled: true
  path: "/chat"
```

### standalone 전용

```yaml
web-addon:
  auto-install: false
  auto-patch-webapp-conf: false

standalone-web:
  enabled: true
  path: "/chat"
```

standalone URL:

```text
http://<server-host>:8899/chat
```

## HTTPS / Caddy 권장 구성

공개 운영에서는 HTTP API를 직접 외부에 열지 말고, BlueMap과 BlueMapWebChat을 내부 HTTP로 두고 HTTPS 리버스 프록시 뒤에 두는 구성을 권장합니다.

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
  # 권장값은 빈 값입니다. web-addon.api-base-url을 따라갑니다.
  # 같은 경로를 명시하려면 "/bmwc/api"를 넣어도 됩니다.
  api-base-url: ""

upload:
  # 권장값은 빈 값입니다. 업로드 URL은 자동으로 /bmwc/api를 따라갑니다.
  # 기존 명시 방식도 동작합니다: "/bmwc/api" 또는 "/bmwc/api/uploads"
  public-base-url: ""

emoji:
  # 권장값은 빈 값입니다. 이모지 URL은 자동으로 /bmwc/api를 따라갑니다.
  # 기존 명시 방식도 동작합니다: "/bmwc/api" 또는 "/bmwc/api/emojis"
  public-base-url: ""
  max-total-size-mb: 64
  show-storage-usage: true
  show-storage-limit: true
```

예시 경로:

```text
https://map.example.com/          # BlueMap
https://map.example.com/bmwc/api  # BlueMapWebChat API
https://map.example.com/bmwc/chat # standalone 채팅
```


URL 설정 참고: HTTPS 리버스 프록시에서는 `web-addon.api-base-url`을 `/bmwc/api` 같은 공개 API 경로로 설정합니다. `standalone-web.api-base-url`, `upload.public-base-url`, `emoji.public-base-url`은 보통 비워둡니다. 비워두면 standalone은 `web-addon.api-base-url`을 재사용하고, 업로드/이모지는 각각 `/uploads`, `/emojis`를 자동으로 붙입니다. 기존 명시 방식인 `/bmwc/api`, `/bmwc/api/uploads`, `/bmwc/api/emojis`도 허용됩니다. 선행 `/`가 없는 상대값은 `http.cors-origin`이 실제 origin일 때 그 origin을 앞에 붙입니다.

자세한 내용은 `docs/CADDY_HTTPS_KO.md`를 참고하세요.

## 자주 쓰는 설정

- `ui.language`: 기본 UI 언어. `en-US`, `ko-KR`, `ja-JP`, `zh-CN`
- `ui.theme`: `system`, `dark`, `light`, `high-contrast`
- `player-display.mode`: `name`, `display-name`, `custom-name`
- `player-display.strip-colors`: `false`면 실제 채팅 작성자 이름에 Minecraft legacy 색상 코드를 렌더링합니다. 시스템/event 메시지는 항상 색상 코드를 제거합니다.
- `commands.enabled`: 웹 명령어 패널 사용 여부
- `commands.allow-all`: 프리셋 외 임의 콘솔 명령어 허용 여부
- `commands.run-from-chat-input`: 채팅 입력창의 `/command` 실행 허용 여부
- `ui.picture-in-picture.enabled`: PIP 버튼과 PIP 실행을 함께 제어합니다.

## 커스텀 이모지와 게임 측 이모지 플러그인

BlueMapWebChat은 커스텀 이모지를 `plugins/BlueMapWebChat/emojis` 아래에 저장합니다. 하위 폴더는 이모지 팩으로 처리됩니다.

기본값에서는 웹→게임 채팅이 `:default/wave:`, `:emoji:default/wave:` 같은 커스텀 이모지 토큰을 그대로 보존합니다. ImageEmojis나 다른 게임 측 이모지 플러그인이 Minecraft 채팅에서 같은 토큰 텍스트를 렌더링한다면 이 기본값을 사용하세요.

`emoji.game-link.enabled`를 켠 경우 `emoji.game-link.mode`는 `preserve`, `link`, `label`을 지원합니다.

- `preserve`: 원래 토큰 텍스트를 변경하지 않습니다.
- `link`: 설정된 토큰 텍스트와 BM Web Chat 짧은 이미지 링크를 같이 보냅니다.
- `label`: 설정된 토큰 텍스트만 보냅니다.

`emoji.game-link.*`는 웹→Minecraft 채팅에만 적용됩니다. Discord 이미지 미리보기 링크는 별도 설정으로 분리됩니다. `discordsrv.append-web-emoji-links`는 웹→Discord 메시지용이고, `discordsrv.append-game-emoji-links`는 가능한 경우 DiscordSRV의 일반 Minecraft→Discord 릴레이 메시지를 수정해서 게임→Discord 토큰 URL을 붙입니다. DiscordSRV가 일반 Minecraft 채팅을 이미 릴레이하고 있다면 중복 방지를 위해 `game-to-discord`는 꺼두세요.

BM Web Chat은 ImageEmojis나 다른 게임 측 이모지 플러그인을 직접 호출하지 않고, 리소스팩이나 생성된 glyph도 읽지 않습니다. BM Web Chat은 토큰 텍스트를 보존하고, 가능하면 ImageEmojis보다 먼저 로드되어 게임 측 렌더링 전에 원문 채팅 텍스트를 잡도록 합니다.

GIF/JPG/JPEG/WEBP 이모지를 업로드하면, PNG만 읽는 게임 측 이모지 플러그인과의 호환을 위해 같은 폴더에 PNG sidecar도 생성합니다.

```text
plugins/BlueMapWebChat/emojis/default/wave.gif
plugins/BlueMapWebChat/emojis/default/wave.png
```

웹 UI는 원본 파일을 사용하므로 GIF 애니메이션은 유지됩니다. 게임 측 이모지 플러그인이 같은 이모지 디렉터리를 감시한다면 PNG sidecar를 사용할 수 있습니다. 이모지 추가/변경 후에는 해당 플러그인의 reload 명령을 실행하세요.

## YouTube Shorts, TikTok, X/Twitter 미리보기

YouTube Shorts URL은 일반 YouTube 미리보기로 처리되고, 세로형 플레이어와 반복 재생을 사용하며 기본 활성화됩니다. TikTok과 X/Twitter는 선택형 social embed로 제공되며, 외부 콘텐츠를 브라우저에서 불러오므로 기본값은 비활성화입니다. TikTok은 채팅창 안에서 긴 본문/음악 정보가 내부 스크롤바를 만들지 않도록 공식 `player/v1` iframe을 사용하고 본문/음악 정보는 숨깁니다. 전체 정보는 원문 TikTok 링크에서 열 수 있습니다.

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

TikTok 또는 X/Twitter는 사용자 브라우저에서 외부 embed 요청이 발생해도 되는 서버에서만 켜는 것을 권장합니다. 공개 서버에서는 `click-to-load: true`를 유지해서 사용자가 미리보기를 열 때만 외부 콘텐츠가 로드되게 하는 편이 안전합니다.

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
- `docs/CADDY_HTTPS_KO.md` - HTTPS 리버스 프록시
- `docs/I18N_KO.md` - 다국어 파일과 fallback
- `docs/INSTALL_TROUBLESHOOTING_KO.md` - 설치/업그레이드/문제 해결
- `docs/UPLOAD_SECURITY_KO.md` - 업로드 보안
- `docs/RELEASE_CHECKLIST_KO.md` - 릴리스 체크리스트
- `docs/STANDALONE_REVIEW_KO.md` - BlueMap 의존성/standalone 모드 점검
- `docs/OPERATIONS_SECURITY_KO.md` - 공개 운영, trusted proxy 로그, 보안 체크리스트

## 주의

HTTP 전용 사용은 개인/테스트 용도로만 권장합니다. 비밀번호는 서버에 해시로 저장되지만, HTTP 로그인 트래픽 자체는 암호화되지 않습니다. 공개 운영에서는 HTTPS를 사용하세요.

폰트 참고: 설치된 글꼴은 CSS font-family 이름으로 입력해야 합니다. 채팅 설정의 확인 버튼으로 권한 요청 없이 현재 브라우저에서 해당 이름이 적용 가능한지 추정할 수 있습니다.
