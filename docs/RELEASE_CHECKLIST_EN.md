# BlueMapWebChat Release Checklist

Before publishing a release:

- Update `pom.xml` version.
- Update `src/main/resources/plugin.yml` version.
- Update the version comment in `src/main/resources/config.yml`.
- Update README build output examples.
- Add a changelog entry.
- Run JavaScript syntax checks:

```bash
node --check inner.js
node --check src/main/resources/web/chat.js
```

- Validate YAML files:

```bash
python3 - <<'PY'
import yaml, glob
for path in ['src/main/resources/config.yml'] + glob.glob('src/main/resources/lang/*.yml'):
    with open(path, encoding='utf-8') as f:
        yaml.safe_load(f)
    print('OK', path)
PY
```

- Verify language key parity against `en-US.yml`.
- Build with Maven:

```bash
mvn clean package
```

- Test that `webapp.conf` points to the new version query.
- Test browser loading with DevTools cache disabled.
