# kintone-cli 設計ドキュメント

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
- **スキーマ自己検査**: `--describe` でコマンドのパラメータスキーマを出力
- **安全機構**: 書き込み系コマンドに `--dry-run` を実装
- **出力はJSON**: デフォルトでJSONを出力（マシンリーダブル）
- **SKILL.md同梱**: AIエージェント向けの利用ガイドをパッケージに含める

## OpenAPI Specの活用

公式OpenAPI Spec: https://github.com/kintone/rest-api-spec

コマンドの実装は**静的**（エンドポイントごとにコードを記述）とする。OpenAPI Specは以下の用途でランタイムに同梱・活用する:

- `--json` ペイロードのバリデーション（API呼び出し前の検証）
- `--describe` によるスキーマ自己検査の出力元
- テスト生成の素材
- spec更新時の差分検出（保守）

## パッケージ・コマンド名

- パッケージ名: `kintone-cli`
- コマンド名: `kintone-cli`（正式）、`ktc`（短縮）
- 両方使用可能

```json
{
  "name": "kintone-cli",
  "bin": {
    "kintone-cli": "./dist/index.js",
    "ktc": "./dist/index.js"
  }
}
```

SKILL.mdでは `ktc` を正規名として案内する。

## コマンド体系

### 命名規則

kintone REST APIのパス構造に準拠する。

- パス → サブコマンド
- HTTPメソッド → 動詞（`GET` → `get`, `POST` → `add`, `PUT` → `update`, `DELETE` → `delete`）

```
GET    /k/v1/record          → ktc record get
POST   /k/v1/record          → ktc record add
PUT    /k/v1/record          → ktc record update
DELETE /k/v1/records         → ktc records delete
GET    /k/v1/records         → ktc records get
GET    /k/v1/app             → ktc app get
GET    /k/v1/apps            → ktc apps get
GET    /k/v1/app/form/fields → ktc app form-fields get
POST   /k/v1/record/comment  → ktc record comment add
GET    /k/v1/record/comments → ktc record comments get
```

### preview系API

`preview` をサブコマンドとして配置する（API準拠）。

```
PUT  /k/v1/preview/app/form/fields → ktc preview app form-fields update
POST /k/v1/preview/app/deploy      → ktc preview app deploy add
GET  /k/v1/preview/app/deploy      → ktc preview app deploy get
```

### guest space対応

`--guest-space-id` フラグでパスを切り替える。guest系はAPIの機能・パラメータが通常版と同一で、パスだけが異なるため。

```bash
ktc record get --app 1 --guest-space-id 5
# → GET /k/guest/5/v1/record
```

### 入力方式

`--json` で生APIペイロードを優先。頻用APIには便利フラグも併用可。

```bash
# 生ペイロード
ktc record add --json '{"app": 1, "records": [{"名前": {"value": "田中"}}]}'

# 便利フラグ（頻用APIのみ）
ktc record get --app 1 --id 10
```

## 認証

### 対応方式

1. パスワード認証
2. APIトークン認証
3. OAuthクライアント認証

### 指定方法

環境変数 + コマンドラインフラグ。初期リリースでは設定ファイル不要。

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
$ ktc record get --app 1
Warning: Multiple auth methods detected. Using API token. Use --auth-type to specify.
```

## エラー出力

- **CLI側のエラー**（引数不正、認証情報未設定等）: stderrにテキスト出力
- **APIエラー**: stderrにkintoneのレスポンスJSONをそのまま透過
- **exit code**: 全て `1`（成功時は `0`）

```bash
# CLI側エラー
$ ktc record get
Error: Missing required option: --app

# APIエラー
$ ktc record get --app 999
{"code":"GAIA_APP01","id":"xxx","message":"The app (app: 999) not found..."}
```

## 出力制御

### フィールドマスク（`--fields`）

取得するフィールドを指定し、出力を必要最小限に制限する。AIエージェントのコンテキストウィンドウ節約に有効。

```bash
ktc record get --app 1 --id 10 --fields "レコード番号,名前,ステータス"
```

### ページネーション

`records get` のデフォルトは1ページ分（最大500件）のみ返す。`--page-all` で全件取得。

```bash
# デフォルト: 1ページ分のJSON配列
ktc records get --app 1

# 全件取得: NDJSONでストリーム出力（1行1レコード）
ktc records get --app 1 --page-all
```

`--page-all` 時はNDJSON（Newline Delimited JSON）形式で出力する。内部ではcursor APIを使用し、1レコードずつストリーム出力するため：

- メモリを圧迫しない
- パイプとの相性が良い（`jq`, `head`, `wc` 等で途中処理・打ち切り可能）
- AIエージェントのコンテキストウィンドウに全件流し込まない

```bash
# パイプで絞り込み
ktc records get --app 1 --page-all | jq 'select(.ステータス.value == "完了")'

# ファイルに保存
ktc records get --app 1 --page-all > records.jsonl
```

## 技術スタック

- TypeScript
- CLIフレームワーク: Commander.js
- コードはコーディングエージェントが記述

## 実装フェーズ

### Phase 1: 設計検証

全APIパターンを網羅する最小セットを実装し、設計の妥当性を検証する。問題がなければ残りを一気に実装する。

| パターン | コマンド |
|---------|---------|
| GET（単一） | `record get` |
| GET（複数） | `records get` |
| POST（作成） | `record add` |
| PUT（更新） | `record update` |
| DELETE | `records delete` |
| preview系 | `preview app deploy add` / `preview app deploy get` |
| 設定変更系 | `preview app form-fields add` / `update` / `delete` |
| ファイル系（multipart） | `file` |

### Phase 2: 全API実装

Phase 1の設計検証後、残りの全APIを実装する。

## SKILL.md

AIエージェント向けの利用ガイドとしてSKILL.mdをリポジトリに同梱する。内容は実装後に作成。配布方法（`npx skills add` 対応、CLAUDE.mdへの記載等）は後日決定。

含めるべき項目：

- 基本的な使い方とコマンド例
- 認証の設定方法
- エージェント向けのルール（`--dry-run`の使用、`--fields`での絞り込み等）
- よく使うパターン

## 未決事項

- 出力フォーマットオプション（`--format table` 等）の要否
- SKILL.mdの配布方法

