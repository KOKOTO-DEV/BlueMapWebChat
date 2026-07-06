# BlueMapWebChat 설정 참고

`plugins/BlueMapWebChat/config.yml` 기준 설명입니다.

## 전체 활성화 스위치

새로 생성된 config는 최상단 `enabled: false` 상태입니다. 이 상태에서는 BlueMapWebChat이 config를 생성/로드하기만 하고 `/bmchat reload`만 계속 사용할 수 있으며, 웹/채팅 서비스, 리스너, Discord 연동, DM 저장소, 애드온 설치, 업로드/이모지 초기화, 정리 작업을 시작하지 않습니다. 기존 config에 이 키가 없으면 업그레이드 호환성을 위해 활성 상태로 처리합니다. 저장 방식, 보관 기간, 업로드, 미리보기, 인증, 외부 공개 설정을 확인한 뒤 `enabled: true`로 변경하세요.

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

### 업로드 저장 용량 제한

`upload.max-total-size-mb`는 `upload.directory` 바로 아래 일반 파일의 총 용량을 제한합니다. 기본값 `0`은 무제한입니다. 새 업로드로 제한을 넘게 되면 BlueMapWebChat은 오래된 미참조 업로드부터 삭제합니다. 채팅 기록, SQLite 기록, DM/그룹 메시지, 보존 대상 고정 메시지에서 참조 중인 파일은 유지됩니다. 정리 후에도 공간이 부족하면 업로드가 거부됩니다.

### 이모지 용량 표시

`emoji.max-total-size-mb`는 커스텀 이모지 전체 용량을 제한합니다. 제한을 초과하면 관리자 업로드 화면에서 경고가 표시됩니다. `emoji.show-storage-usage`는 현재 이모지 용량 표시 여부, `emoji.show-storage-limit`는 전체 용량 제한 표시 여부를 제어합니다.

## 채팅 기록 저장

채팅 기록 보관은 `chat.history-storage`로 `memory`, `jsonl`, `sqlite` 중 하나를 고르고, `chat.history-size`와 `chat.history-retention-days`를 세 모드가 공통으로 사용합니다. `0`은 각각 개수/기간 제한 없음입니다. 새로 생성된 config는 최상단 `enabled: false` 상태이므로, 이 값들을 검토하고 `enabled: true`로 바꾸기 전까지 정리 작업이 실행되지 않습니다. 서버 정책상 자동 정리가 필요하면 `30`, `90` 같은 양수 보관일을 설정하세요. 업로드와 외부 미디어 캐시 보관 설정도 같은 방식으로 동작합니다. `chat.history-file`은 JSONL에서만, `chat.history-sqlite-file`은 SQLite에서만 사용됩니다.


## 1:1 메시지함 / DM 스레드

`direct-message.enabled`를 켜면 1:1 대화 스레드형 메시지함을 사용할 수 있습니다. 대상은 UUID/이름이 저장된 연동 또는 접속 기록이 있는 플레이어로 제한됩니다. 스레드는 두 UUID를 정렬한 쌍으로 식별하므로 A→B와 B→A가 항상 같은 대화로 들어갑니다. 메시지는 `direct-message.storage`로 지정한 전용 DM 저장소에 저장됩니다. `auto`는 공개 채팅이 `jsonl` 저장방식일 때 DM도 JSONL을 사용하고, 그 외에는 SQLite를 사용합니다. SQLite는 `direct-message.sqlite-file`, JSONL은 `direct-message.jsonl-file`을 사용합니다.

`direct-message.retention-days: 0`은 보관 기한 없음입니다. 1 이상의 값은 DM 메시지함 제목 옆에 보관 기간으로 표시되며, 해당 일수가 지난 DM 원문은 물리 삭제됩니다. `direct-message.max-messages-per-thread: 0`은 스레드별 개수 정리 없음입니다. `direct-message.confirm-hide`는 웹 UI에서 DM을 내 화면에서 숨길 때 확인창을 띄울지 정합니다. 개인 메시지가 서버에 저장되는 기능이므로 기본값은 비활성화입니다.

## UI 타임존

`ui.time-zone`은 채팅 시간 표시 타임존을 지정합니다. `local`은 브라우저/기기 로컬 타임존을 사용하고, `UTC` 또는 `Asia/Seoul` 같은 IANA 타임존을 지정할 수 있습니다. 잘못된 값은 웹 UI에서 로컬 시간으로 fallback됩니다.

## 0 = 무제한/제한 없음인 옵션

- `chat.history-size`
- `chat.history-retention-days`
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
- `direct-message.retention-days`
- `direct-message.max-messages-per-thread`
- `direct-message.max-message-length`

## 게스트 채팅 제한

```yaml
guest:
  cooldown-seconds: 6
  max-messages-per-minute: 50
```

게스트 채팅은 `cooldown-seconds`와 `max-messages-per-minute` 두 설정으로 제한됩니다. 분당 메시지 기본값은 `50`입니다. 이미 생성된 서버의 설정 파일은 자동으로 덮어쓰기 되지 않으므로, 기존 설치에서 새 기본값을 쓰려면 `plugins/BlueMapWebChat/config.yml`을 직접 수정하세요.

## Minecraft 채팅 답글 표시

```yaml
reply:
  game-preview:
    enabled: true
    format: "&7{sender}: {preview}"
    max-length: 120

  game-prefix:
    enabled: true
    text: "↪ [Reply] "
```

웹 또는 게스트 메시지가 다른 메시지에 답글을 달면 `game-preview.enabled`가 원문 미리보기를 실제 웹 메시지보다 먼저 Minecraft 채팅에 별도 한 줄로 보냅니다. 이렇게 하면 기존 웹→게임 채팅 포맷은 유지하면서, 원문 줄과 실제 메시지 줄의 URL을 각각 클릭 가능하게 유지할 수 있습니다.

원문 미리보기는 일반 웹 메시지와 같은 웹→게임 커스텀 이모지 처리를 사용합니다. 기본 토큰 보존 설정에서는 커스텀 이모지 토큰이 그대로 유지되고, `emoji.game-link.enabled`를 명시적으로 켠 경우 선택한 game-link mode가 적용됩니다. 긴 원문은 `max-length` 기준으로 `…` 처리됩니다. `0`으로 두면 원문 미리보기 자체의 길이 제한을 끕니다.

`game-prefix`는 실제 답글 메시지 줄의 라벨/prefix를 제어합니다. 기본 웹 포맷에서는 `[Web] Player: message`를 `↪ [Reply] Player: message`로 바꿉니다. BlueMapWebChat은 이미 렌더링된 전달 문자열의 앞부분에서 처음 나오는 대괄호 소스 라벨을 교체합니다. 대괄호 라벨이 없으면 prefix 텍스트를 앞에 붙입니다.

`game-preview.format`과 `game-prefix.text`는 둘 다 `&7` 같은 Minecraft legacy 색상 코드를 지원합니다.

## Discord 연동 옵션

```yaml
discordsrv:
  append-web-emoji-links: true
  game-to-discord: false
  append-game-emoji-links: true
  max-emoji-links-per-message: 4
  reply-relay:
    enabled: false
    prefix-enabled: true
    preview-enabled: true
    preview-max-length: 120
```

`discordsrv.append-web-emoji-links`는 웹→Discord 메시지에 BM Web Chat 커스텀 이모지 토큰의 이미지 URL을 추가합니다. `discordsrv.append-game-emoji-links`는 가능한 경우 DiscordSRV의 일반 Minecraft→Discord 릴레이 메시지를 수정해서 게임에서 입력한 이모지 토큰의 이미지 URL을 추가합니다. 선택 기능인 `discordsrv.game-to-discord`는 BM Web Chat이 게임 채팅을 Discord로 직접 보내게 하는 기능이므로, DiscordSRV가 이미 일반 Minecraft 채팅을 릴레이하고 있다면 중복을 피하기 위해 꺼두세요. 이 설정들은 웹→Minecraft 채팅에만 적용되는 `emoji.game-link.*`와 별개입니다.

`discordsrv.reply-relay`는 웹 답글 원문 미리보기를 Discord에도 보낼지 제어합니다. Discord 메시지에 댓글처럼 보이는 추가 줄이 생기지 않도록 기본값은 비활성화입니다.

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

`strip-colors: false`이면 웹 UI의 실제 채팅 발신자 이름에만 Minecraft legacy 색상 코드가 렌더링됩니다. 시스템/이벤트 메시지와 Discord 출력은 원시 Minecraft 색상 코드를 제거합니다. 저장되어 있던 표시 이름도 다시 사용할 때 현재 `strip-colors` 설정 기준으로 정규화됩니다.

## 커스텀 이모지와 게임 측 이모지 플러그인

BlueMapWebChat은 커스텀 이모지를 `plugins/BlueMapWebChat/emojis` 아래에 저장합니다. 하위 폴더는 이모지 팩으로 처리됩니다.

기본값에서는 `emoji.game-link.enabled`가 `false`이므로 웹→게임 메시지의 `:pack/name:`, `:emoji:pack/name:` 같은 커스텀 이모지 토큰을 그대로 보존합니다. ImageEmojis나 다른 게임 측 이모지 플러그인이 Minecraft 채팅에서 토큰을 렌더링한다면 이 기본값을 사용하세요.

`emoji.game-link.enabled`가 `true`일 때 `emoji.game-link.mode`는 `preserve`, `link`, `label`을 지원합니다.

- `preserve`: game-link가 켜져 있어도 토큰 보존 동작을 강제합니다.
- `link`: `label-format` 텍스트와 BM Web Chat 짧은 이미지 링크를 같이 보냅니다.
- `label`: `label-format` 텍스트만 보냅니다.

`emoji.game-link.*`는 웹→Minecraft 채팅에만 적용됩니다. Discord 이미지 미리보기 링크는 웹→Discord용 `discordsrv.append-web-emoji-links`와 게임→Discord용 `discordsrv.append-game-emoji-links`로 분리해서 제어합니다. `append-game-emoji-links`는 DiscordSRV의 일반 Minecraft→Discord 릴레이 메시지를 가능한 경우 수정하며, `game-to-discord`는 BM Web Chat이 게임 채팅을 Discord로 직접 보낼 때만 필요합니다.

BM Web Chat은 ImageEmojis나 다른 게임 측 이모지 플러그인을 직접 호출하지 않고, 리소스팩이나 생성된 glyph도 읽지 않습니다. BM Web Chat은 토큰 텍스트를 보존하고, 가능하면 ImageEmojis보다 먼저 로드되어 게임 측 렌더링 전에 원문 채팅 텍스트를 잡도록 합니다.

토큰 보존 동작이 활성 상태이고 같은 줄에 URL도 포함되어 있으면, BM Web Chat은 URL 참조 줄을 반복해서 보내지 않고 한 줄의 plain Minecraft 채팅으로 유지합니다. 이렇게 해야 게임 쪽 이모지 플러그인이 원래 토큰 문자열을 읽을 수 있습니다.

`default-pack`과 `aliases`는 flat 게임 측 토큰을 BM Web Chat의 pack/name id로 매핑할 때 사용합니다. 예:

```yaml
emoji:
  game-link:
    default-pack: "default"
    aliases:
      wave: "default/wave"
```

GIF/JPG/JPEG/WEBP 이모지 원본은 PNG만 읽는 게임 측 이모지 플러그인과의 호환을 위해 같은 폴더에 PNG sidecar를 자동 생성합니다. 웹 UI는 원본 파일을 사용하므로 GIF 애니메이션은 유지됩니다.

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


## 브라우저 알림과 Web Push

`notifications`는 브라우저 웹알림과 모바일/백그라운드 Web Push가 공통으로 사용하는 알림 기본값과 서버 측 허용 상한선을 제어합니다. `notifications.enabled`가 양쪽 전달 경로의 단일 기본 ON/OFF 값이며, 기존 `browser-notifications.*`와 `web-push.notify-*` 키는 마이그레이션/호환용 입력값으로만 읽습니다. `notify-*` 값을 `true`로 두면 각 사용자/브라우저가 채팅 설정에서 켜고 끌 수 있고, `false`로 두면 사용자가 켜도 해당 알림 종류는 차단됩니다. `notify-system`이 허용된 경우 사용자는 채팅 설정에서 서버 알림을 전체, 입장/퇴장만, 끄기 중에서 고를 수 있습니다. `notify-keywords`는 사용자가 직접 지정하는 키워드 알림을 제어하고, `notify-replies`는 공개 채팅에서 내 메시지에 답글이 달렸을 때의 알림을 제어합니다. 키워드 목록은 브라우저/기기별로 저장되며, 백그라운드 매칭을 위해 해당 기기의 Web Push 구독에만 동기화됩니다.

`web-push`는 VAPID 키, subject, 구독 파일, TTL, 기본 푸시 제목 같은 Web Push 전송 설정만 보관합니다. HTTPS 또는 localhost, 브라우저 알림 권한, Service Worker/Push API 지원이 맞으면 백그라운드/모바일 푸시를 보낼 수 있습니다. Android/데스크톱 브라우저는 현재 origin이 Service Worker + Push API를 지원하면 BlueMap addon 또는 standalone 페이지 어디서든 푸시를 켤 수 있습니다. iOS/iPadOS의 일반 브라우저 탭은 Web Push를 지원하지 않으므로 홈 화면에 추가한 웹앱으로 연 페이지에서만 시도하고, 지원되지 않는 동작은 플랫폼 제한으로 봅니다. `notifications.enabled: true` 상태에서 VAPID 키를 비워두면 플러그인이 `web-push-vapid.properties`에 지속 키를 생성합니다. `web-push.subject`는 `mailto:admin@example.com` 또는 `https://map.example.com`처럼 실제 연락처/운영자 식별용 VAPID URI로 두는 것을 권장합니다. 임의 문자열은 권장하지 않으며 일부 push 서비스에서 거부되거나 신뢰도가 낮게 처리될 수 있습니다. 모바일의 “스팸일 수 있음” 같은 경고는 브라우저/OS가 표시하는 것이므로 플러그인에서 끌 수 없습니다. 안정적인 HTTPS 도메인, 의미 있는 알림 제목/본문, 보수적인 알림 필터, 반복 테스트 알림 최소화로 가능성을 줄이는 쪽으로 관리합니다. 테스트는 모바일 브라우저에서 현재 HTTPS 채팅 페이지를 열고 로그인한 뒤 설정 > 알림에서 알림을 켜고 테스트를 누릅니다. iOS/iPadOS에서는 먼저 이 페이지를 홈 화면에 추가한 뒤 웹앱으로 열어야 합니다.

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

## 메시지 검색

저장된 기록을 사용할 때 채팅 패널 우측 상단 플로팅 영역의 돋보기 버튼과 `/history/search` API로 메시지 내용과 작성자를 검색할 수 있습니다. 검색 옵션에서 날짜/시간 범위, 작성자, 출처, 시스템/이벤트 포함 여부를 지정할 수 있습니다. 검색 결과는 스크롤 가능한 목록으로 표시되며, 채팅 테마와 폰트 설정을 따릅니다. 검색 결과를 클릭하면 기존 주변 기록 로드 방식으로 해당 메시지로 이동합니다. i18n 키가 있는 시스템/이벤트 메시지는 가능한 경우 요청된 웹 UI 언어 기준으로 검색되고 표시됩니다. 검색은 `search.enabled`로 끄거나 켤 수 있고, `search.result-limit` 하나가 웹 UI 결과 수와 `/history/search` API 제한을 모두 제어합니다. 별도 내부 최대치는 없어서 2000으로 설정하면 최대 2000개, 10으로 설정하면 최대 10개가 반환됩니다. 10000이나 100000처럼 매우 큰 값도 허용되지만, 검색 속도 저하, 응답 크기 증가, CPU/메모리/DB 부하 증가를 일으킬 수 있습니다. 기본값은 50이며 일반 사용은 50~200을 권장합니다. 기존 config.yml에는 이 항목을 직접 추가하거나 기본 설정과 병합해야 합니다.

## 그룹 채팅

`group-chat.enabled`는 웹 그룹 채팅 기능을 켭니다. 공개/비공개 방, 해시 저장되는 선택 비밀번호, 초대, 방 나가기, 방 숨김/다시 표시, 방 설정, 안 읽음 추적, 사용자별 메시지 숨김, 멤버 강퇴/차단/차단 해제, 방장 이전을 지원합니다. 그룹 메시지는 `group-chat.sqlite-file`(기본 `group-messages.db`)에 저장됩니다. `group-chat.retention-days: 0`은 기간 정리 없음이고, 양수 값은 오래된 그룹 메시지를 물리 삭제합니다.


## 비공개 채팅 메타데이터 최고관리자

`private-chat-super-admins: []`에는 DM/그룹채팅 메타데이터를 관리/용량 확인용으로 볼 수 있는 정확한 UUID 또는 마인크래프트 이름을 지정합니다. 이 화면은 참여자/제목, 메시지 수, 대략적인 저장 용량, 보관 상태, 메타데이터 세션 삭제 같은 관리 동작만 제공하며 메시지 본문은 노출하지 않습니다.


`standalone-web.app-name`과 `standalone-web.app-short-name`은 standalone 페이지/PWA 이름을 제어합니다. 모바일 홈 화면 웹앱으로 설치한 뒤 값을 바꿨다면 다시 설치해야 반영됩니다. `web-push.notification-title`은 테스트/시스템/백그라운드 푸시의 기본 제목을 제어하며, 비워두면 `standalone-web.app-name`을 사용합니다.


기존 config에 `BlueMapWebChat` 또는 `BM WebChat` 같은 예전 기본 이름이 남아 있으면 레거시 기본값으로 보고 새 fallback을 사용합니다.
