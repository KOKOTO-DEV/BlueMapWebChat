# BlueMapWebChat 릴리스 체크리스트

릴리스 전 확인 항목:

- `pom.xml` 버전을 갱신합니다.
- `src/main/resources/plugin.yml` 버전을 갱신합니다.
- `src/main/resources/config.yml`의 버전 주석을 갱신합니다.
- README와 문서의 빌드 출력 예시 버전을 갱신합니다.
- CHANGELOG 항목을 추가합니다.
- JavaScript 문법 검사를 실행합니다.

```bash
node --check inner.js
node --check src/main/resources/web/chat.js
```

- YAML 파일을 검증합니다.

```bash
python3 - <<'PY'
import yaml, glob
for path in ['src/main/resources/config.yml'] + glob.glob('src/main/resources/lang/*.yml'):
    with open(path, encoding='utf-8') as f:
        yaml.safe_load(f)
    print('OK', path)
PY
```

- `en-US.yml` 기준으로 언어 키 개수가 일치하는지 확인합니다.
- Maven으로 빌드합니다.

```bash
mvn clean package
```

- `webapp.conf`가 새 버전 query를 가리키는지 확인합니다.
- DevTools 캐시 비활성화 상태로 브라우저 로딩을 테스트합니다.
