# kintone-cli

> AI エージェントと人間のための、スキーマ検証付き kintone REST API CLI。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

`kt` は [kintone REST API](https://kintone.dev/ja/docs/kintone/rest-api/) を、AI エージェント（Claude Code、Codex など）を一次想定ユーザとして設計した、予測可能で薄いファサードである。同時に人間からも問題なく利用できる。すべてのエンドポイントコマンドは kintone 公式の [OpenAPI Specification](https://github.com/kintone/rest-api-spec) に対応しており、同じ Spec をランタイムに同梱して `--json` ペイロードを送信前に検証し、さらに `--schema` でエンドポイント情報を API 呼び出しなしに参照できる。

English: [README.md](README.md)

## なぜ存在するか

LLM ベースのエージェントには、kintone 側ではなく *エージェント側* で早期に失敗するインターフェースが必要である。本 CLI は次の 3 つの性質を中核に置いている。

- **予測可能なコマンドツリー** — `kt <noun> <verb>` の構造を REST API パスに対応させている。例えば `/k/v1/record.json` の POST は常に `kt record add`。人間向けエイリアスや略記は導入しない。
- **`--json` のスキーマ検証** — 書き込み系ペイロードはランタイムに同梱した OpenAPI Spec を Ajv でチェックする。`"rcord"` のようなタイポや必須キー欠落は HTTP 送信前に stderr の構造化 JSON エラーと exit code 1 で拒否される。
- **エンドポイントの自己記述** — どのエンドポイントコマンドにも `--schema` を付けると、その OpenAPI operation を JSON で出力する。認証・API 呼び出し・必須オプションは不要。エージェントは kintone に触れずに wire 形状を確認できる。

パッケージには [`skills/kt/SKILL.md`](skills/kt/SKILL.md) も同梱している。これは AI エージェント向けの user-facing なドキュメントで、Claude Code（または Skill を読む他のエージェントランタイム）に登録すれば、コマンドマップと上記の安全機構をエージェントが利用できる。

## 必要環境

- **Node.js 22 以上。** 本 CLI は Node 組み込みの `fetch` などの最近のプラットフォーム機能を使う。Node 20 を使っているなら次のように切り替える:

  ```bash
  nvm install 22
  nvm use 22
  ```

- 認証情報を持つ kintone テナント（API トークン、パスワード、または OAuth。詳細は[認証](#認証)を参照）。

## インストール

```bash
# グローバルインストール
npm install -g @yoshkosh/kintone-cli

# またはインストールせず都度実行
npx @yoshkosh/kintone-cli --help
```

パッケージは 2 つのバイナリをインストールする:

| バイナリ | 説明 |
|--------|-------------|
| `kt` | 短い形式。本 README と `SKILL.md` の例で使用。 |
| `kintone-cli` | 長い形式。動作は同一。 |

### `kt` がすでに PATH 上にある場合の対処

`kt` は短く一般的な名前で、他のツールやエイリアスとよく衝突する（[k0sproject の `kt`](https://github.com/k0sproject/kt)、`kubectl` 用の個人エイリアス、[k14s `kapp` / `kbld` / `ytt`](https://carvel.dev/) ファミリ、過去の `npm install -g` の残骸など）。実際にどのコマンドが解決されるかを先に確認する:

```bash
command -v kt
type -a kt
```

`kt` がすでに別のものを指している場合、次の **いずれか** を選ぶ:

- 長い名前を使う: `kintone-cli record get --app 1 --id 1`。
- `npx` 経由で実行する: `npx @yoshkosh/kintone-cli record get --app 1 --id 1`。
- シェルの rc にローカルなエイリアスを追加する:

  ```bash
  alias kt-kintone='kintone-cli'
  ```

本 README と `SKILL.md` の例は `kt` を使う。衝突がある場合は上記いずれかに読み替えてほしい（動作は変わらない）。

## 認証

認証情報は環境変数で渡す。`direnv`、`1Password`、macOS Keychain、シェル rc など、普段使いの管理方法に乗せて構わない。本 CLI は設定ファイルを読み書きしない。

| 環境変数 | 必須 | 備考 |
|----------|----------|-------|
| `KINTONE_BASE_URL` | 常に必須 | 例: `https://example.cybozu.com` |
| `KINTONE_API_TOKEN` | 3 方式から 1 つ | アプリ単位のトークン。複数アプリ時はカンマ区切り |
| `KINTONE_USERNAME` + `KINTONE_PASSWORD` | 3 方式から 1 つ | パスワード認証 |
| `KINTONE_OAUTH_CLIENT_ID` + `KINTONE_OAUTH_CLIENT_SECRET` + `KINTONE_OAUTH_REFRESH_TOKEN` | 3 方式から 1 つ | OAuth — フックは入っているが、トークン交換は未実装 |

複数の方式が同時に検出された場合は警告を出して先頭の方式を使う。`--auth-type api-token`（または `password` / `oauth`）を渡せば明示的に選択できる。

## コマンド体系

トップレベルコマンドは kintone REST API のパス構造に対応している:

```text
kt preview                Preview（事前公開）系 (/k/v1/preview)
kt record / kt records    単一・複数レコード操作
kt bulk-request           /k/v1/bulkRequest
kt file                   /k/v1/file
kt app / kt apps          アプリ・アプリ一覧操作
kt field-acl              /k/v1/field/acl
kt space / kt spaces      スペース・スペース一覧操作
kt template               テンプレート操作
kt guests                 ゲストユーザ操作
kt plugin / kt plugins    システムプラグイン操作
```

最新の一覧は `kt --help` で確認できる。各サブツリーは `kt <cmd> --help`、完全なコマンドマップは [`skills/kt/SKILL.md`](skills/kt/SKILL.md) を参照。

### 共通フラグ

| フラグ | 適用先 | 説明 |
|------|------------|-------------|
| `--auth-type <type>` | グローバル | `api-token`、`password`、`oauth` |
| `--guest-space-id <id>` | ほとんどのエンドポイント | ゲストスペース用パスプレフィックス。システム系では無視される |
| `--json <payload>` | 書き込み系 | kintone API リクエストボディ。送信前に検証される |
| `--dry-run` | 書き込み系 | リクエスト内容を出力するのみ。HTTP 送信はしない |
| `--schema` | 全エンドポイント | OpenAPI operation を JSON 出力。認証・API 呼び出し不要 |
| `--skip-validation` | `--json` 全コマンド | ペイロード検証をスキップ（最終手段の脱出口） |

## 使用例

```bash
# 単一レコード取得
kt record get --app 42 --id 1

# レコード検索 + フィールド絞り込み
kt records get --app 42 --query 'ステータス = "完了"' --fields "レコード番号,名前"

# 全レコードを NDJSON でストリーム、jq で後処理
kt records get --app 42 --page-all --fields "レコード番号,名前" \
  | jq 'select(.["名前"].value | test("田中"))'

# レコード追加 — まず dry-run、その後本実行
kt record add --dry-run --json '{"app": 42, "record": {"名前": {"value": "新規"}}}'
kt record add --json '{"app": 42, "record": {"名前": {"value": "新規"}}}'

# bulk-request（bulkRequest エンドポイントは書き込み系メソッドのみ受け付ける）
kt bulk-request add --dry-run --json '{"requests": [{"method": "POST", "api": "/k/v1/record.json", "payload": {"app": 1, "record": {"名前": {"value": "新規"}}}}]}'

# API 呼び出しなしで wire 形状を確認
kt record add --schema | jq .operation.requestBody
kt records get --schema | jq '.operation.parameters[] | select(.in == "query") | .name'

# Preview ワークフロー: 設定編集 → デプロイ
kt preview app settings update --dry-run --json '{"app": 42, "name": "改名後"}'
kt preview app deploy add --json '{"apps": [{"app": 42}]}'
kt preview app deploy get --apps 42

# アプリ権限
kt app acl get --app 42
kt field-acl get --app 42

# スペース
kt space get --id 1
kt space members get --id 1
```

## `--json` 検証の概要

`--json` ペイロードは API 呼び出し前に kintone OpenAPI Spec で検証される（`--dry-run` でも検証は行われる）。必須キー欠落、coercion で吸収できない型不一致、トップレベルの余分なキーは、stderr の JSON エラーと exit code 1 で拒否される。

```bash
$ kt record add --json '{}'
{"error":"json_validation_failed","method":"POST","path":"/k/v1/record.json","errors":[{"instancePath":"","keyword":"required","message":"must have required property 'app'","params":{"missingProperty":"app"}},{"instancePath":"","keyword":"required","message":"must have required property 'record'","params":{"missingProperty":"record"}}]}
$ echo $?
1
```

`params` ブロックは機械可読を意図して構造化している。エージェントは `params.missingProperty`（欠落した必須キー）、`params.additionalProperty`（`"rcord"` のようなタイポ候補）から、メッセージ文字列をパースせずに復旧できる。

`bulk-request add` では、`requests[i].payload` を外側のエンベロープだけでなく、`(method, api)` で選んだ *サブスキーマ* に対しても検証する。形が合わないサブペイロードは正しいパスでエラーになる。未知またはケースが一致しない `(method, api)` の組み合わせは `bulkRequestUnknownSubapi` キーワードで拒否される。

Spec 側が古い・過剰に厳しいなどの理由で kintone は受理するペイロードが弾かれる場合は `--skip-validation` を付ける。使用ごとに stderr へ通知が出るため、ログでバイパスを追える。

## `--schema` 自己検査

```bash
kt record add --schema | jq .
kt preview app form-fields update --schema | jq .operation.requestBody.content
```

`--schema` はエンドポイントの `{ method, path, operation }` を compact JSON で出力する。このとき:

- HTTP 呼び出しは行われない。
- `KINTONE_BASE_URL` と認証は不要。
- `--guest-space-id` は無視される（ゲストパスは Spec 上同一の operation を共有するため、非ゲストパスを返す）。
- 必須オプションを省略できる（`kt record add --schema` は `--json` なしで動く）。
- `--dry-run` と併用しても、出力は schema のみとなる。

## 同梱 Claude Code Skill の利用

パッケージには [`skills/kt/SKILL.md`](skills/kt/SKILL.md) を同梱している。これは [Claude Code Skill](https://docs.claude.com/ja/docs/claude-code/skills) として完成しており、コマンドマップ全量・ペイロード検証の挙動・エージェント向けに安全な Bash パターンを記載している。

Claude Code に登録するには:

1. CLI をインストールして `PATH` 上で `kt` を使えるようにする:

   ```bash
   npm install -g @yoshkosh/kintone-cli
   ```

2. 同梱の skill ディレクトリを Claude Code のスキルフォルダにコピー（またはシンボリックリンク）する:

   ```bash
   mkdir -p ~/.claude/skills
   cp -R "$(npm root -g)/@yoshkosh/kintone-cli/skills/kt" ~/.claude/skills/
   ```

3. Claude Code 側で読み込まれていることを確認する（スキル名は `kt`）:

   ```bash
   ls ~/.claude/skills/kt/SKILL.md
   ```

スキルファイルはプレーンな Markdown で、インストール前に内容を確認できる。実行可能コードは含まれず、エージェントが `kt` コマンドをどう組み立てるかを制約するだけである。

## 第三者著作物

`dist/spec.json` は [`kintone/rest-api-spec`](https://github.com/kintone/rest-api-spec)（Apache License 2.0）から派生している。内容は無改変で同梱しており（YAML → JSON への serialization 変換のみ）、これによりペイロード検証と `--schema` がオフラインで動作する。完全な帰属表示とライセンス情報は [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) を参照。

## ドキュメント案内

- [`skills/kt/SKILL.md`](skills/kt/SKILL.md) — 完全なコマンドマップ。AI エージェント向けに英語で記述。
- [`AGENTS.md`](AGENTS.md) — 本リポジトリ *上で* 作業するコントリビュータとコーディングエージェント向けの規約（英語）。
- [`docs/decisions.md`](docs/decisions.md) — 設計判断記録（ADR）。日本語で記述。
- [`docs/spec.md`](docs/spec.md)、[`docs/ideas.md`](docs/ideas.md)、[`docs/log.md`](docs/log.md) — 内部設計メモ（日本語）。
- [`CHANGELOG.md`](CHANGELOG.md) — バージョン別変更履歴。
- [`SECURITY.md`](SECURITY.md) — 脆弱性報告窓口。
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Issue / PR の出し方。

## 外部参照

- [kintone REST API ドキュメント](https://kintone.dev/ja/docs/kintone/rest-api/)
- [kintone OpenAPI Specification](https://github.com/kintone/rest-api-spec)
- [Claude Code Skills ドキュメント](https://docs.claude.com/ja/docs/claude-code/skills)

## コントリビュート / フィードバック

Issue・Pull Request は歓迎する（建設的な内容に限る）。バグ報告は最小再現と `kt --version` / `node --version` を添えるとデバッグしやすい。フローの概要は [`CONTRIBUTING.md`](CONTRIBUTING.md) を、脆弱性のプライベート報告は [`SECURITY.md`](SECURITY.md) を参照。

## ライセンス

[MIT](LICENSE) © Isao Yoshikoshi。同梱の第三者著作物はそれぞれのライセンスに従う。詳細は [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) を参照。
