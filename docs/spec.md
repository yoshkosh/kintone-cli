# kintone-cli 仕様書

## 概要

kintone REST APIをラップしたCLIツール。

- MCPよりも軽量
- CIやスクリプトに組み込みやすい
- AIエージェントからのkintone操作のファサードとして適している
- マイナーなAPIにも対応
- npmパッケージ、TypeScript

## 設計原則

参考: [Rewrite your CLI for AI Agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/)

> "Human DX optimizes for discoverability. Agent DX optimizes for predictability."

- **予測可能性**: コマンド体系をkintone REST APIのパス構造に準拠させる
- **生ペイロード入力**: `--json` でAPIリクエストボディをそのまま渡せる
- **スキーマ自己検査**: `--schema` でコマンドの OpenAPI Spec 該当部分を出力
- **安全機構**: 書き込み系コマンドに `--dry-run` を実装
- **出力はJSON**: デフォルトでJSONを出力（マシンリーダブル）
- **SKILL.md同梱**: AIエージェント向けの利用ガイドをパッケージに含める

## パッケージ・コマンド名

- パッケージ名: `@yoshkosh/kintone-cli`
- コマンド名: `kintone-cli`（正式）、`kt`（短縮）
- 両方使用可能。SKILL.mdでは `kt` を正規名として案内する

```json
{
  "name": "@yoshkosh/kintone-cli",
  "bin": {
    "kintone-cli": "./dist/index.js",
    "kt": "./dist/index.js"
  }
}
```

## コマンド体系

### 命名規則

kintone REST APIのパス構造に準拠する。

- パス → サブコマンド
- HTTPメソッド → 動詞（`GET` → `get`, `POST` → `add`, `PUT` → `update`, `DELETE` → `delete`）

```
GET    /k/v1/record          → kt record get
POST   /k/v1/record          → kt record add
PUT    /k/v1/record          → kt record update
DELETE /k/v1/records         → kt records delete
GET    /k/v1/records         → kt records get
GET    /k/v1/app             → kt app get
GET    /k/v1/apps            → kt apps get
GET    /k/v1/app/form/fields → kt app form-fields get
POST   /k/v1/record/comment  → kt record comment add
GET    /k/v1/record/comments → kt record comments get
```

### preview系API

`preview` をサブコマンドとして配置する（API準拠）。

```
PUT  /k/v1/preview/app/form/fields → kt preview app form-fields update
POST /k/v1/preview/app/deploy      → kt preview app deploy add
GET  /k/v1/preview/app/deploy      → kt preview app deploy get
```

### guest space対応

`--guest-space-id` フラグでパスを切り替える。guest系はAPIの機能・パラメータが通常版と同一で、パスだけが異なるため。

```bash
kt record get --app 1 --guest-space-id 5
# → GET /k/guest/5/v1/record
```

システムレベルの操作（`plugin`, `plugins`, `bulk-request`, `guests`, `statistics`）は guest space 非対応。`--guest-space-id` 付きで呼び出された場合はCLI側で即座にエラーを返す。

### 通知系APIのコマンド名

パス中のスラッシュ（`notifications/general` 等）はハイフンで結合してフラット化する。

```
GET /k/v1/app/notifications/general → kt app notifications-general get
```

### 入力方式

`--json` で生APIペイロードを優先。頻用APIには便利フラグも併用可。

```bash
# 生ペイロード
kt record add --json '{"app": 1, "records": [{"名前": {"value": "田中"}}]}'

# 便利フラグ（頻用APIのみ）
kt record get --app 1 --id 10
```

`--json` で渡された payload は、API 呼び出し前に OpenAPI Spec の requestBody（DELETE 系は parameters）で検証される。必須欠落・型不一致・余分なトップレベルプロパティを事前に検出する。spec 側不整合などで誤検出された場合は `--skip-validation` で例外的にスキップできる（最終手段）。

`bulk-request add --json` は二段検証で、`requests[i].payload` を `(method, api)` から決まる sub-schema で個別に検証する。typo（`{rcord:{}}`）や形違い payload の混入（`method:"DELETE"` に records add 用 payload）も検出する。`(method, api)` がサポート対象 8 種（record/records POST/PUT/DELETE、status/assignees PUT）に該当しない場合は `bulkRequestUnknownSubapi` として弾き、`method` は upper-case 完全一致のみ受け付ける。`requests[i]` の余分プロパティ（`{method, api, payload, comment}` の `comment` 等）も `additionalProperties` で弾く。

## 認証

### 対応方式

1. パスワード認証
2. APIトークン認証
3. OAuthクライアント認証

### 指定方法

環境変数 + コマンドラインフラグ。設定ファイルは不要。

```bash
# 共通（必須）
KINTONE_BASE_URL=https://example.cybozu.com

# パスワード認証
KINTONE_USERNAME=user
KINTONE_PASSWORD=pass

# APIトークン認証
KINTONE_API_TOKEN=xxxxx
# 複数トークン（アプリ横断時）
KINTONE_API_TOKEN=token1,token2

# OAuth
KINTONE_OAUTH_CLIENT_ID=xxxxx
KINTONE_OAUTH_CLIENT_SECRET=xxxxx
KINTONE_OAUTH_REFRESH_TOKEN=xxxxx
```

### 複数認証方式の競合

複数の認証情報が同時にセットされている場合、**警告を出しつつ動作する**。`--auth-type` で明示指定すれば警告なし。

```bash
$ kt record get --app 1
Warning: Multiple auth methods detected. Using API token. Use --auth-type to specify.
```

## エラー出力

- **CLI側のエラー**（引数不正、認証情報未設定等）: stderrにテキスト出力
- **CLI側のエラー（`--json` バリデーション失敗）**: stderr に **JSON** を出力（CLI/API の弁別は `error` キーの有無で行う）
- **APIエラー**: stderrにkintoneのレスポンスJSONをそのまま透過
- **exit code**: 全て `1`（成功時は `0`）

```bash
# CLI側エラー（テキスト）
$ kt record get
Error: Missing required option: --app

# CLI側エラー（JSON: --json バリデーション失敗のみ例外的に JSON 化）
$ kt record add --json '{}'
{"error":"json_validation_failed","method":"POST","path":"/k/v1/record.json","errors":[{"instancePath":"","keyword":"required","message":"must have required property 'app'","params":{"missingProperty":"app"}}]}

# APIエラー
$ kt record get --app 999
{"code":"GAIA_APP01","id":"xxx","message":"The app (app: 999) not found..."}
```

## 出力制御

### フィールドマスク（`--fields`）

取得するフィールドを指定し、出力を必要最小限に制限する。AIエージェントのコンテキストウィンドウ節約に有効。

```bash
kt record get --app 1 --id 10 --fields "レコード番号,名前,ステータス"
```

### ページネーション

`records get` のデフォルトは1ページ分（最大500件）のみ返す。`--page-all` で全件取得。

```bash
# デフォルト: 1ページ分のJSON配列
kt records get --app 1

# 全件取得: NDJSONでストリーム出力（1行1レコード）
kt records get --app 1 --page-all
```

`--page-all` 時はNDJSON（Newline Delimited JSON）形式で出力する。内部ではcursor APIを使用し、1レコードずつストリーム出力するため：

- メモリを圧迫しない
- パイプとの相性が良い（`jq`, `head`, `wc` 等で途中処理・打ち切り可能）
- AIエージェントのコンテキストウィンドウに全件流し込まない

```bash
# パイプで絞り込み
kt records get --app 1 --page-all | jq 'select(.ステータス.value == "完了")'

# ファイルに保存
kt records get --app 1 --page-all > records.jsonl
```

## OpenAPI Specの活用

公式OpenAPI Spec: https://github.com/kintone/rest-api-spec

コマンドの実装は**静的**（エンドポイントごとにコードを記述）とする。OpenAPI Specは以下の用途でランタイムに同梱・活用する:

- `--json` ペイロードのバリデーション（API 呼び出し前の検証、`--skip-validation` で例外的にバイパス可）
- `--schema` によるスキーマ自己検査の出力元
- テスト生成の素材
- spec更新時の差分検出（保守）

## 技術スタック

- TypeScript（ESM）
- CLIフレームワーク: Commander.js
- ランタイム: Node.js

## ファイル構成

```
src/
  index.ts              エントリーポイント
  auth.ts               認証モジュール
  client.ts             HTTPクライアント
  commands/
    shared.ts           共通ヘルパー
    record.ts           record/records コマンド
    comment.ts          record comment/comments コマンド
    status.ts           record status/assignees, records acl-evaluate コマンド
    preview.ts          preview app deploy/form-fields/add/settings/form-layout コマンド
    app.ts              app/apps コマンド
    acl.ts              ACL コマンド（live + preview）
    app-settings.ts     アプリ設定9種（テーブル駆動、live GET + preview GET/PUT）
    app-plugins.ts      アプリプラグイン + app move コマンド
    space.ts            space/thread/template/guests コマンド
    plugin.ts           システムプラグイン管理コマンド
    bulk-request.ts     バルクリクエストコマンド
    statistics.ts       統計APIコマンド
    file.ts             file get/add コマンド
skills/
  kt/SKILL.md           AIエージェント向け利用ガイド（Agent Skills仕様準拠）
```

## SKILL.md

AIエージェント向けの利用ガイドとして `skills/kt/SKILL.md` をリポジトリに同梱する。Agent Skills仕様（https://agentskills.io/specification）に準拠。

- `npx skills add <path> -g -a claude-code -y` でClaude Codeのスキルとして登録
- `/kt` で呼び出し可能
- コマンド一覧、認証設定、利用ルール、使用例を記載

