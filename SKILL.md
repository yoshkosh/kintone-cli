---
name: ktc
description: kintone REST API CLI tool
---

# ktc (kintone-cli)

kintone REST APIの操作には `ktc` コマンドを使用すること。

## 認証

環境変数で設定:

```bash
KINTONE_BASE_URL=https://example.cybozu.com
KINTONE_API_TOKEN=xxxxx
# または
KINTONE_USERNAME=user
KINTONE_PASSWORD=pass
```

## 基本的な使い方

```bash
# ヘルプ
ktc --help
ktc <command> --help

# レコード操作
ktc record get --app <id> --id <id>
ktc records get --app <id> --fields "フィールド1,フィールド2"
ktc records get --app <id> --page-all | jq '...'
ktc record add --json '{"app": 1, "record": {...}}'
ktc record update --json '{"app": 1, "id": 1, "record": {...}}'

# アプリ情報
ktc app get --id <id>
ktc apps get
ktc app form-fields get --app <id>
ktc app settings get --app <id>

# 権限
ktc app acl get --app <id>
ktc field-acl get --app <id>
ktc record acl get --app <id>

# プレビュー（設定変更）
ktc preview app form-fields add --json '{...}'
ktc preview app deploy add --json '{"apps": [{"app": 1}]}'
```

## ルール

- 書き込み・削除操作の前に `--dry-run` で確認すること
- `records get` では `--fields` で必要なフィールドだけ取得すること
- 大量データは `--page-all` でNDJSON出力し、`jq` でフィルタすること
- `--json` でkintone APIのリクエストボディをそのまま渡せる
