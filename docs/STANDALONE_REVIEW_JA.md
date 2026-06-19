# BlueMap 依存性 / standalone モード確認

## 概要

Java プラグイン本体は BlueMap API に依存していません。`plugin.yml` には BlueMap の `depend` / `softdepend` がなく、Java ソースにも BlueMap API の import はありません。実行時の依存先は Bukkit/Spigot 系サーバー API です。DiscordSRV 連携は任意です。

そのため、チャット機能自体は BlueMap なしでも動作します。BlueMap 固有の部分は、BlueMap の web ディレクトリへ web アセットをコピーし、`webapp.conf` をパッチする任意の web addon インストーラーです。

## 対応モード

BlueMapWebChat は現在、次の 2 つの形態をサポートします。

```text
BlueMap addon panel
standalone /chat page
```

standalone モードはデフォルトでは無効です。必要な場合のみ明示的に有効化してください。

```yaml
standalone-web:
  enabled: true
  path: "/chat"
  api-base-url: ""
```

直接 HTTP URL:

```text
http://<server-host>:8899/chat
```

HTTPS リバースプロキシ URL 例:

```text
https://<domain>/bmwc/chat
```

## standalone 専用運用

BlueMap 地図内にチャット UI を挿入しない場合は、次のように設定します。

```yaml
standalone-web:
  enabled: true
  path: "/chat"

web-addon:
  auto-install: false
  auto-patch-webapp-conf: false
```


## 透過ウィンドウの制限

standalone のブラウザーウィンドウや Document Picture-in-Picture ウィンドウは、通常の Web API だけでは OS レベルの真の透過ウィンドウにはできません。CSS でチャットパネル自体を半透明にすることはできますが、ブラウザー/PIP ウィンドウ背景やデスクトップ透過はブラウザーまたは OS 側の制御になります。
