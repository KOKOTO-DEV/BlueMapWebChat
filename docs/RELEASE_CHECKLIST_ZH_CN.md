# BlueMapWebChat 发布检查清单

发布前请确认：

- 更新 `pom.xml` 版本。
- 更新 `src/main/resources/plugin.yml` 版本。
- 更新 `src/main/resources/config.yml` 中的版本注释。
- 更新 README 和文档中的构建输出版本示例。
- 添加 CHANGELOG 条目。
- 运行 JavaScript 语法检查。

```bash
node --check inner.js
node --check src/main/resources/web/chat.js
```

- 验证 YAML 文件。

```bash
python3 - <<'PY'
import yaml, glob
for path in ['src/main/resources/config.yml'] + glob.glob('src/main/resources/lang/*.yml'):
    with open(path, encoding='utf-8') as f:
        yaml.safe_load(f)
    print('OK', path)
PY
```

- 以 `en-US.yml` 为基准确认语言键一致。
- 使用 Maven 构建。

```bash
mvn clean package
```

- 确认 `webapp.conf` 指向新的版本 query。
- 在 DevTools 禁用缓存后测试浏览器加载。
