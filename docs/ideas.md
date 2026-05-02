# 残作業・アイディア

未着手の作業項目とアイディアを集約する場所。決定したら [decisions.md](decisions.md) へ、実装したら [spec.md](spec.md) を更新する。

---

## CLI 機能

### `--schema` オプション

OpenAPI Spec の該当エンドポイント部分を抽出して出力する。設計原則の「スキーマ自己検査」に対応。

#### 決定事項（2026-04-07 議論）

- オプション名: `--schema`（出力が OpenAPI Spec そのものなので `--describe` ではない）
- 出力内容: 該当エンドポイントの OpenAPI Spec 部分を抽出
- 出力形式: JSON
- spec の取り込み方法: `third_party/rest-api-spec/openapi.yaml` に bundled を同梱済（2026-04-21 時点）
- ビルド: YAML → JSON 変換のみ。全体をバンドル
- 抽出ロジック: `--schema` 実行時にランタイムで行う

#### 未決事項

- `kt --schema`（引数なし）で全体一覧を出すかどうか
- YAML → JSON 変換ライブラリ（現在 `yaml` を dev 依存。runtime 依存への昇格を実装時に確定）
- decisions.md への正式記録タイミング

### `--json` ペイロードのバリデーション

設計原則に含まれているが未実装。OpenAPI Spec をランタイムに同梱して、`--json` で投入されるペイロードを投入前に検証する。

実装時に必要な作業:

- `ajv` を dev 依存から runtime 依存に昇格
- ビルド時 YAML → JSON 変換（`dist/spec.json`）を導入
- `src/__test-helpers__/spec-validator.ts` のロジックを runtime 用に移植

### 出力フォーマットオプション（将来候補）

`--format table` 等の人間向け出力フォーマット。2026-03-12 の初期リリース判断で見送り。JSON 出力のみで AI エージェント用途には十分だが、人間が直接使う場面では不便。

---

## テスト・品質

### bulkRequest 等での spec 厳密度の追加検証

probe では 3 エンドポイント（`record GET/POST`、`records GET`）のみ確認済。bulkRequest のような複雑な requestBody で spec の検出力が落ちないかを実物のテスト中に観察する。

### エラーレスポンスの構造化アサーション（Layer B）

現状エラーテストは Layer A（透過出力の単純検証）のみ。`KintoneAPIError` の構造化設計とセットで、`{id, code, message}` 3 フィールドを構造化アサーションする Layer B を導入する。

### カバレッジ計測

`vitest --coverage` を導入する。レイヤ別ポリシー（pure / 統合 / ヘルパで異なる目標値）の適用を検討。

### Tier 2 手動スモーク

リリース前運用として、5〜10 ケースの手動スモークを整備する。

---

## 配布・運用

### npm 正式公開時のクリーンアップ

GitHub Package Registry（private）で暫定公開している状態から、npmjs.org に正式公開する際の必要作業:

- `~/.npmrc` から `@yoshkosh` スコープ設定とトークンを削除
- GitHub PAT（`ghp_` で始まるトークン）を revoke
- プロジェクトの `.npmrc` も不要になる
- `package.json` の `publishConfig` を変更または削除

**背景**: dogfooding 用の暫定措置。PAT トークンが残っているとセキュリティリスク。

### SKILL.md に Claude Code Bash 制約セクション追加

`skills/kt/SKILL.md` に、Claude Code の permission checker heuristics を回避するためのガイドを追加する。agent-slack の "CRITICAL: Bash command formatting rules" セクション（[参考レポート](../reports/agent-slack-analysis.md)）と同等の内容。

- `#`、`''`/`""`、`&&`/`||`、`>` リダイレクトを避ける指針
- 複数コマンドは別々の Bash tool call に分ける
- `jq` パイプのみ推奨

**目的**: エージェント実行時の承認ダイアログを減らす。

### llms.txt の配置

`llmstxt.org` 規格に沿った `llms.txt` をリポジトリルートに配置し、npm パッケージの `files` にも含める。エージェントが「この CLI は何か」を短く発見できるようにする。
