# BlueMapWebChat 업로드 보안 참고

파일 업로드는 편리하지만 공개 서버에서는 악용될 수 있습니다. 기본 설정은 게스트 업로드를 비활성화합니다.

## 권장 기본값

```yaml
upload:
  enabled: true
  allow-guest-upload: false
  allow-user-upload: true
  allow-moderator-upload: true
  allow-admin-upload: true
  max-file-size-mb: 20
  max-files-per-message: 3
  cooldown-seconds: 5
  max-uploads-per-minute: 4
  retention-days: 5
```

## 공개 서버

별도 모더레이션 체계가 없다면 게스트 업로드는 끄세요. 게스트 업로드를 켜야 한다면 파일 크기 제한을 낮추고 보관 기간을 짧게 잡으세요.

## 공개 URL

직접 HTTP 예시:

```yaml
upload:
  public-base-url: ""
```

같은 도메인 HTTPS 프록시 예시:

```yaml
web-addon:
  api-base-url: "/bmwc/api"

upload:
  public-base-url: "/bmwc/api/uploads"
```

앞에 `/`가 붙은 값은 같은 origin의 브라우저 경로로 처리됩니다. 같은 도메인 프록시에서는 전체 FQDN을 쓸 필요가 없습니다.

## 허용 확장자

채팅에서 실제로 표시하거나 공유할 파일 형식만 허용하세요. BlueMapWebChat은 확장자와 크기로 제한하지만, 공개 배포에서는 제한된 디렉터리에서 제공하고 HTTPS를 사용하는 것을 권장합니다.
