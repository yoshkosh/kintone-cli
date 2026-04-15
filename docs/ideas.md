# アイディア・検討事項

未決事項、アイディア、将来の検討事項を記録する場所。決定したら [decisions.md](decisions.md) へ、実装したら [spec.md](spec.md) を更新する。

---

## 出力フォーマットオプション

`--format table` 等の人間向け出力フォーマット。2026-03-12に初期リリースでは見送りと判断したが、将来の検討候補として残す。JSON出力のみでAIエージェント用途には十分だが、人間が直接使う場面では不便。

## `--describe` / OpenAPIバリデーション

設計原則に含まれているが未実装。OpenAPI Specをランタイムに同梱し、`--describe` でパラメータスキーマを出力する機能と、`--json` ペイロードのバリデーション。実装コストと優先度を検討中。

## テスト

自動テストがまだない。Phase 4としてテスト追加を予定しているが、テスト戦略（ユニットテスト vs E2E、モック vs 実環境）は未検討。

## `--schema` オプション（2026-04-07 議論）

OpenAPI Spec を出力する `--schema` オプションの設計方針。

### 決定事項

- オプション名: `--schema`（`--describe` ではない。出力が OpenAPI Spec そのものなので）
- 出力内容: 該当エンドポイントの OpenAPI Spec 部分を抽出
- 出力形式: JSON（CLI 全体の設計原則と一貫）
- spec の管理方法: `kintone/rest-api-spec` を Git submodule として参照
- ビルド: YAML → JSON 変換のみ。全体をバンドル（86.3KB なので分割不要）
- 抽出ロジック: `--schema` 実行時にランタイムで行う

### 未決事項

- `kt --schema`（引数なし）で全体一覧を出すかどうか
- submodule 内のどのパスを参照するか（`bundled/openapi.yaml` か `openapi.yaml` か）
- YAML → JSON 変換に使うライブラリ
- decisions.md への正式記録タイミング

## npm 公開時のクリーンアップ

GitHub Package Registry（private）で暫定公開している状態から、npmjs.org に正式公開する際の必要作業:

- `~/.npmrc` から `@yoshkosh` スコープ設定とトークンを削除
- GitHub PAT（`ghp_` で始まるトークン）を revoke
- プロジェクトの `.npmrc` も不要になる
- `package.json` の `publishConfig` を変更または削除

**背景**: dogfooding 用の暫定措置。PAT トークンが残っているとセキュリティリスク。

## SKILL.md に Claude Code Bash 制約セクション追加（agent-slack 参考）

`skills/kt/SKILL.md` に、Claude Code の permission checker heuristics を回避するためのガイドを追加する。agent-slack の "CRITICAL: Bash command formatting rules" セクション（[参考レポート](../reports/agent-slack-analysis.md)）と同等の内容。

- `#`、`''`/`""`、`&&`/`||`、`>` リダイレクトを避ける指針
- 複数コマンドは別々の Bash tool call に分ける
- `jq` パイプのみ推奨

**目的**: エージェント実行時の承認ダイアログを減らす。

## llms.txt の配置（agent-slack 参考）

`llmstxt.org` 規格に沿った `llms.txt` をリポジトリルートに配置し、npm パッケージの `files` にも含める。エージェントが「この CLI は何か」を短く発見できるようにする。
