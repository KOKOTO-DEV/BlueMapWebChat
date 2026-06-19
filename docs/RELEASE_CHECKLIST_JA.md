# BlueMapWebChat リリースチェックリスト

公開前の確認事項:

- `pom.xml` のバージョンを更新します。
- `src/main/resources/plugin.yml` のバージョンを更新します。
- `src/main/resources/config.yml` のバージョンコメントを更新します。
- README とドキュメントのビルド出力例を更新します。
- CHANGELOG に項目を追加します。
- JavaScript 構文チェックを実行します。

```bash
node --check inner.js
node --check src/main/resources/web/chat.js
```

- YAML ファイルを検証します。

```bash
python3 - <<'PY'
import yaml, glob
for path in ['src/main/resources/config.yml'] + glob.glob('src/main/resources/lang/*.yml'):
    with open(path, encoding='utf-8') as f:
        yaml.safe_load(f)
    print('OK', path)
PY
```

- `en-US.yml` を基準に言語キー数が一致するか確認します。
- Maven でビルドします。

```bash
mvn clean package
```

- `webapp.conf` が新しいバージョン query を指しているか確認します。
- DevTools でキャッシュを無効にしてブラウザ読み込みをテストします。
