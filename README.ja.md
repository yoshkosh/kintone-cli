# kintone-cli

AI エージェントからの利用を前提に設計した kintone REST API のコマンドラインツールです。手動入力でも扱いやすいように工夫されています。

> このツールの基本思想や設計は、Justin Poehnelt 氏の記事 [*Rewrite your CLI for AI Agents*](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/) を参考にさせていただいています。

---

## AI エージェントのための設計

### SKILL.md と `--schema` でコマンド体系を先に開示する

エージェントは SKILL.md でコマンド一覧と使い方を把握し、不足する情報を `--schema` や API パスとの対応関係から補うことができます。

- **AI エージェント用 skill の同梱**
  - [`skills/kt/SKILL.md`](skills/kt/SKILL.md) を npm パッケージに同梱（[agentskills.io 仕様](https://agentskills.io/specification)準拠）
  - Claude Code など agentskills.io 対応ランタイムに登録すれば、エージェントは skill 読み込み時点で本ツールの使い方を把握
- **スキーマ自己検査（`--schema`）**
  - 各エンドポイントコマンドで、そのコマンドが対応する API エンドポイントの OpenAPI 定義（リクエストボディの構造、パラメータの型、必須項目）を JSON で標準出力に出力
  - 認証情報、`KINTONE_BASE_URL`、必須オプションのいずれも不要
  - ネットワーク通信なし
- **API パスに対応したコマンド体系** — 各コマンドが kintone REST API のパスと HTTP メソッドに 1:1 対応（例: `POST /k/v1/record.json` → `kt record add`）

### `--fields` / `--page-all` / 環境変数認証でエージェントの実行環境に合わせる

コンテキストウィンドウや認証経路など、エージェント側の実行環境に向けた設計です。

- **取得フィールドの絞り込み（`--fields`）** — `records get` で取得フィールドを限定。必要なフィールドだけに絞り込んで応答サイズを抑制
- **カーソル API による全件ストリーム取得（`--page-all`）**
  - `records get --page-all` で全レコードをカーソル API で取得可能（デフォルトは 1 ページ・最大 500 件）
  - 1 行 1 JSON の NDJSON ストリームとして取得するため、バッファリングせずに処理することが可能で、コンテキストウィンドウを圧迫しない
- **環境変数による認証** — 認証情報は環境変数のみから読み取り、設定ファイルやブラウザリダイレクトは使用しない。エージェントランタイムや CI、コンテナから利用しやすい

#### サンプル: 必要なフィールドだけを NDJSON で全件取得する

```sh
$ kt records get --app 42 --fields "タイトル,ステータス" --page-all
{"タイトル":{"value":"見積依頼 A"},"ステータス":{"value":"open"}}
{"タイトル":{"value":"見積依頼 B"},"ステータス":{"value":"closed"}}
{"タイトル":{"value":"見積依頼 C"},"ステータス":{"value":"open"}}
...
```

- `--fields` で取得フィールドを 2 つに絞り、`--page-all` で 1 行 1 レコードの NDJSON として出力した例
- `| jq 'select(.["ステータス"].value == "open")'` で途中フィルタしたり、`| head -n 100` で先頭だけ取り出したりできる
  - レコード数が多くても結果セット全体をエージェントのコンテキストに読み込まずにすむ

### 送信前のローカル検証

誤ったリクエストを HTTP 通信の実行前に抑止することができます。

- **送信前バリデーション付きの `--json`**
  - HTTP 通信前に同梱の OpenAPI スキーマで検証
  - エラー時は構造化 JSON で返却。`additionalProperty` や `missingProperty` などのキーから、エージェント自身が出力を修正可能
  - 複数の API 呼び出しをまとめて送る `bulk-request add` でも、各サブリクエストを送信先 API ごとのスキーマで個別に検証。エラーには `/requests/0/payload` のように「何番目のサブリクエストか」を示すパスが含まれるため、原因のサブリクエストだけ特定して修正可能
- **dry-run による事前確認**
  - write 系コマンドで `--dry-run` を指定すると送信予定の HTTP メソッド、URL、ボディを出力
  - リクエストの発行なし
  - `--dry-run` でも `--json` のバリデーションは実行されるため、送信せずに payload の検証が可能

#### サンプル: 送信前に typo を検出する

```sh
$ kt record add --json '{"app":1,"rcord":{"name":{"value":"x"}}}' --dry-run
{"error":"json_validation_failed","method":"POST","path":"/k/v1/record.json",
 "errors":[
   {"instancePath":"","keyword":"required",
    "params":{"missingProperty":"record"}},
   {"instancePath":"","keyword":"additionalProperties",
    "params":{"additionalProperty":"rcord"}}
 ]}
```

- 最上位キーの `record` を `rcord` と誤入力した例
- 送信前のバリデーションで失敗し、`params.missingProperty: "record"` と `params.additionalProperty: "rcord"` という機械可読な情報がエージェントに返却
- エージェント自身がこの値を参照して出力を修正可能
- HTTP リクエストは未発行のため、kintone のレート制限を消費せず、エラーレスポンスを読み解くトークンも不要

---

## セットアップ

### 前提

- Node.js 22 以上
- 接続先の kintone 環境とアクセス権限

### インストール

```sh
npm install -g @yoshkosh/kintone-cli
```

インストール後は `kt` または `kintone-cli` のどちらのコマンド名でも起動できます。本ドキュメントの例では `kt` を使用します。

動作確認:

```sh
kt --version
```

#### AI エージェント向けスキルのインストール（任意）

AI エージェントから利用しない場合、この手順はスキップして構いません。

スキル定義は GitHub リポジトリの `skills/` 配下に同梱されており、`npx skills` から GitHub URL を直接指定して登録できます（CLI 本体の `npm install -g` は不要）。

```sh
# Claude Code の例（GitHub から直接取得）
npx skills add https://github.com/yoshkosh/kintone-cli -g -a claude-code -y
```

- skill ファイル自体は agentskills.io 仕様準拠のため、同仕様に対応する他のランタイムでも利用可能
- エージェント側の仕様詳細は [`skills/kt/SKILL.md`](skills/kt/SKILL.md) を参照

### kintone への接続

`kt` は認証情報を環境変数から取得します。設定ファイルは使用しません。サポートする認証方式は以下の 3 種類です。

| 方式         | 必要な環境変数                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| API トークン | `KINTONE_BASE_URL`, `KINTONE_API_TOKEN`                                                                     |
| パスワード   | `KINTONE_BASE_URL`, `KINTONE_USERNAME`, `KINTONE_PASSWORD`                                                  |
| OAuth        | `KINTONE_BASE_URL`, `KINTONE_OAUTH_CLIENT_ID`, `KINTONE_OAUTH_CLIENT_SECRET`, `KINTONE_OAUTH_REFRESH_TOKEN` |

> OAuth 認証は未実装です（後述「制約事項」を参照）。当面は API トークンまたはパスワード認証を推奨します。

- 表は優先順位順に記載。複数の方式の認証情報がセットされている場合、警告を表示した上で、上から順に最初に取得できた認証情報を使用
- `--auth-type api-token|password|oauth` で認証方式を明示することも可能

疎通確認の例（API トークン認証）:

```sh
export KINTONE_BASE_URL="https://your-subdomain.cybozu.com"
export KINTONE_API_TOKEN="..."
kt app get --id <appId>
```

---

## 使い方

### REST API のパス・メソッドから CLI コマンドを特定する

| kintone REST API                         | `kt` コマンド                                |
| ---------------------------------------- | -------------------------------------------- |
| `GET /k/v1/record.json`                  | `kt record get`                              |
| `POST /k/v1/records.json`                | `kt records add`                             |
| `PUT /k/v1/preview/app/form/fields.json` | `kt preview app form-fields update`          |
| `POST /k/guest/{spaceId}/v1/record.json` | `kt record add --guest-space-id <spaceId>`   |

- **`preview`** — フラグではなくサブコマンド階層そのもの。運用環境とプレビューを取り違える操作ミスが構造的に防がれる
- **`--guest-space-id`** — API パスを書き換えるためのオプション。コマンド本体は guest space 用と通常用で同一

コマンド一覧は [`skills/kt/SKILL.md`](skills/kt/SKILL.md) を参照してください。

### `--fields` と `--page-all` で大量レコードを NDJSON ストリームとして取り出す

```sh
kt records get --app 42 --fields "タイトル,担当者,ステータス" --page-all > records.jsonl
```

- アプリ 42 の全レコードを、3 フィールドのみ、1 行 1 JSON 形式で出力
- `jq 'select(...)'` での絞り込み、`head -n 100` での先頭サンプル抽出、ファイルへの保存と再利用などが可能
- 結果セット全体をエージェントのコンテキストに読み込まずに済む

### `--schema` で API のリクエスト形式をオフライン・認証なしで確認する

```sh
kt record add --schema | jq .operation.requestBody
```

`POST /k/v1/record.json` のリクエストボディスキーマを表示します。`--json` を組み立てる前にペイロードの形を確認するときに使えます。`KINTONE_BASE_URL` や認証情報を持たない環境（CI、開発機など）でも実行できます。

### `--dry-run` で検証してから送信する

```sh
# 1. dry-run でローカル検証する。HTTP は呼ばれない。
kt record add --json "$(cat payload.json)" --dry-run

# 2. --dry-run を外して実送信する。
kt record add --json "$(cat payload.json)"
```

ステップ 1 で失敗した場合、エージェントは構造化エラーを参照してペイロードを修正できます。ステップ 2 はステップ 1 を通過したときのみ実行する運用が可能です。

### プレビューで変更してから運用環境にデプロイする

```sh
# 1. プレビュー環境のフォームフィールドを更新する。
kt preview app form-fields update --app 42 --json "$(cat fields.json)"

# 2. プレビューを運用環境にデプロイする。
kt preview app deploy add --json '{"apps":[{"app":42}]}'
```

ステップ 1 はプレビュー環境のみを変更し、ステップ 2 で運用環境に反映されます。

---

## 制約事項

- **OAuth 認証** — 未実装（実装予定）。当面は API トークンまたはパスワード認証のみ利用可能
- **応答サニタイズ** — 未実装（実装予定）。`--sanitize` 実装までの間、エージェントへ渡すコンテキストにおいては、kintone のレコード値をプロンプトインジェクションを含みうる「信頼できない入力」として扱うこと
- **入力ハードニング** — typo・必須項目・型などスキーマレベルの検査は実装済み。ファイルパス・制御文字・URL エンコーディングなど文字列レベルのハードニングは部分実装（実装予定）。詳細は [`SECURITY.md`](SECURITY.md) を参照

---

## ドキュメント

- 英語版 README: [README.md](README.md)
- AI エージェント向け仕様: [`skills/kt/SKILL.md`](skills/kt/SKILL.md)
- 設計原則: [`docs/spec.md`](docs/spec.md)
- アーキテクチャ判断記録（ADR）: [`docs/decisions.md`](docs/decisions.md)
- コントリビューター向け: [`CONTRIBUTING.md`](CONTRIBUTING.md) / [`AGENTS.md`](AGENTS.md)
- セキュリティポリシー: [`SECURITY.md`](SECURITY.md)
- 変更履歴: [`CHANGELOG.md`](CHANGELOG.md)

## ライセンス

- MIT ライセンス（[`LICENSE`](LICENSE) 参照）
- 同梱の第三者著作物（kintone REST API Spec 等）はそれぞれのライセンスに準拠（[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) 参照）
