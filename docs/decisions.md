# 設計判断記録（ADR）

設計上の意思決定とその理由を記録する。「なぜそうしたか」を後から振り返れるようにするためのドキュメント。

---

## 2026-03-11 コマンド体系: APIパス準拠

**決定**: kintone REST APIのパス構造にコマンド名を準拠させる。

**理由**: AIエージェント向けCLIとして「予測可能性」を最優先。APIドキュメントを読めばコマンドが推測できる。

**不採用案**: 人間向けエイリアス（`record list` → `records get` 等）。発見しやすさより予測可能性を優先した。

---

## 2026-03-11 OpenAPI Spec: 静的実装 + ランタイム同梱

**決定**: コマンドは静的実装（エンドポイントごとにコードを記述）。OpenAPI Specはランタイムでバリデーション・`--describe`・保守に活用。

**理由**: 動的生成（specからコマンドを自動生成する方式）はgws CLIの事例があるが、kintone-cliの規模では静的実装の方がシンプルで制御しやすい。

**不採用案**: ランタイム動的生成。gws CLI（Rust製）はGoogle Discovery Serviceから動的生成しているが、API数が桁違いに多い。

---

## 2026-03-11 認証: 環境変数 + フラグ、設定ファイル不要

**決定**: 認証情報は環境変数とコマンドラインフラグで指定。設定ファイル（`.kintonerc` 等）は作らない。

**理由**: CLIツールの複雑さを最小限に保つ。環境変数はdirenv等の既存ツールで管理できる。

---

## 2026-03-24 環境変数管理: direnv + macOS Keychain

**決定**: 環境変数の管理は direnv + macOS Keychain に統一。

**理由**: セキュアな環境変数管理のため。Keychain に認証情報を保管し、direnv で環境変数として展開する。

**不採用案**: dotenvx。暗号化 `.env` ファイルをコミット可能にする代替案だったが、OS ネイティブのシークレットストアの方がシンプルで安全。

---

## 2026-03-11 preview系API: サブコマンドとして配置

**決定**: `preview` をトップレベルのサブコマンドとして配置する（`kt preview app ...`）。

**理由**: APIパス（`/k/v1/preview/app/...`）に準拠。設計原則の「予測可能性」に忠実。

**不採用案**:
- `--preview` フラグ方式: コマンドの意味が変わるのにフラグで制御するのは不自然
- 暗黙的なpreview適用: 安全性の問題

---

## 2026-03-11 guest space: フラグ方式

**決定**: `--guest-space-id` フラグでパスを切り替える。専用コマンドは作らない。

**理由**: guest space APIの機能・パラメータは通常版と同一で、パスだけが異なることをOpenAPI Specで確認済み。

---

## 2026-03-11 エラー出力: APIレスポンス透過

**決定**: APIエラーはkintoneのレスポンスJSONをstderrにそのまま出力する。exit codeは種別を区別しない（全て1）。

**理由**: AIエージェントがkintoneのエラーコード（`GAIA_APP01` 等）を直接読めるようにする。CLI側でエラーメッセージを加工すると情報が落ちる。

---

## 2026-03-11 CLIフレームワーク: Commander.js

**決定**: Commander.jsを採用。

**理由**: サブコマンドの深いネストが必要（`kt preview app form-fields get` 等）。

**不採用案**: CAC（Command And Conquer）。軽量だがサブコマンドのネスト非対応。

---

## 2026-03-12 ページネーション: デフォルト1ページ + NDJSON全件取得

**決定**: `records get` はデフォルト1ページ（最大500件）。`--page-all` でcursor APIによるNDJSON全件取得。

**理由**: AIエージェントのコンテキストウィンドウに全件流し込まないための安全設計。NDJSONはパイプとの相性が良く、途中打ち切り可能。

---

## 2026-03-12 出力フォーマット: `--format table` 見送り

**決定**: 初期リリースでは `--format table` 等の出力フォーマットオプションを実装しない。

**理由**: 後から追加可能で既存動作に影響なし。JSON出力のみでAIエージェント用途には十分。

---

## 2026-03-17 ACLコマンド構造: APIパス準拠

**決定**: ACLコマンドはAPIパスに忠実に配置する。`app acl get`（app配下）、`field-acl get`（トップレベル）、`record acl get`（record配下）。

**理由**: 設計原則の「予測可能性」に忠実。

**不採用案**: ACLグルーピング（`acl app get`, `acl field get`, `acl record get`）。実装はシンプルだがAPIパスから逸脱する。

---

## 2026-03-24 コメントAPI: `--text` 便利フラグ不採用

**決定**: `record comment add` には `--json` のみ。`--text` 等の便利フラグは作らない。

**理由**: `--json` でも `comment.text` の1段ネストのみで、`--app` と `--record` が別途必要な分、便利フラグとの利便性の差が小さい。排他ロジックの導入コストに見合わない。他のPOSTコマンドと同じパターンに統一。

---

## 2026-03-26 アプリ設定API: テーブル駆動パターン

**決定**: 9種類のアプリ設定API（views, customize, reports, status, actions, admin-notes, notifications×3）をテーブル駆動で一括実装。`APP_SETTINGS` 定義テーブル + `registerSettingGet` / `registerSettingUpdate` ヘルパー。

**理由**: 全て「live GET + preview GET/PUT」の同一パターン。個別実装では大量のボイラープレートが発生する。acl.tsの `registerAclGet`/`registerAclUpdate` パターンを拡張した形。

---

## 2026-03-26 システムコマンド: noGuestSpaceガード

**決定**: システムレベルの操作（plugin, bulk-request, guests, statistics）は `--guest-space-id` 付きで呼び出された場合、CLI側で即座にエラーを返す。

**理由**: これらのAPIはguest space非対応。API呼び出し後に不明瞭なエラーを返すより、CLI側で明確なメッセージを出す方が良い。

---

## 2026-03-31 コマンド名: `ktc` → `kt`

**決定**: 短縮コマンド名を `ktc` から `kt` に変更。

**理由**: より短く打ちやすい。kintoneの略として自然。

---

## 2026-04-03 パッケージスコープ: `@latica-jp` → `@yoshkosh`

**決定**: パッケージスコープを `@yoshkosh` に変更。

**理由**: GitHubユーザー名を `latica-jp` → `yoshkosh` に変更したことに伴う。GitHub Package Registryはスコープ付きパッケージ名がユーザー/org名と一致する必要がある。

**補足**: npmjs.orgの `kintone-cli`（アンスコープ）は未登録だが、kintone公式の過去ツール（kintone-labs/kintone-cli、アーカイブ済み）との混同を避けるためスコープ付きを維持。
