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

---

## 2026-04-16 テスト方針: HTTP モック中心 + 手動スモーク

**決定**: Tier 1 (HTTP モック中心の自動テスト) をメインに置き、Tier 2 (実 API の手動スモーク) を補完として扱う。Tier 2 は **リリース前にローカル手動実行** とし、夜間 CI は採用しない。

**理由**: 本 CLI は引数 → URL/ヘッダ/ボディ構築の薄い変換層で、リクエスト構築の正しさはモックで完全検証可能。kintone 側の実挙動検証まで自動化すると setup/teardown コスト・テストアプリ管理の ROI が悪い。Tier 2 を CI 化すると既存の環境変数管理（2026-03-24 direnv + Keychain）と衝突するため、手動運用に留める。

**不採用案**:
- 全コマンドの E2E 自動化: ROI が悪く、テストアプリ状態管理の負担が大きい
- 夜間 CI による Tier 2 自動化: Secrets 運用が既存方針と不整合
- モックのみ: multipart / cursor / 429 等、spec と実 API の乖離検知には実呼び出しが必要

**参考**: `docs/phase4-test-strategy.md` v3 §1, §2

---

## 2026-04-16 テストスタック: vitest + undici MockAgent (stubGlobal 併用)

**決定**: テストランナーは `vitest`、fetch モックは `undici` の `MockAgent` を採用。各テストで `vi.stubGlobal('fetch', undici.fetch)` により global fetch を userland undici に差し替えてから `setGlobalDispatcher(mockAgent)` を有効化する。CLI はインプロセス方式で起動する (`createProgram()` + `main(argv)` に構造分離、`exitOverride()` で exit code を戻り値化)。

**理由**: vitest は ESM/TS ネイティブで harness 導入コストが低い。`MockAgent` は Node 標準 fetch を declarative にインターセプトでき、ボイラープレート最小。Node 22 のビルトイン fetch は **Node 同梱の undici** を使うため、devDep としてインストールした userland undici の `setGlobalDispatcher` 単独では intercept できない。`vi.stubGlobal` で userland undici に橋渡しすることで `MockAgent` が機能する (`feat/phase4-slice` 試作で検証済)。

**不採用案**:
- `node:test` + 自前 fetch mock: ergonomics が弱く ROI 悪
- `nock` / `msw`: fetch ネイティブの MockAgent が最小フィット
- MockAgent 単独 (`stubGlobal` なし): Node 22 では intercept されず実ネットワークに漏れる
- サブプロセス起動方式: インプロセスより 1 桁遅く、デバッガが刺さらない

**参考**: `docs/phase4-test-strategy.md` v3 §3, §4, `docs/phase4-slice-findings.md` H1〜H5

---

## 2026-04-16 テストファイル配置: コロケーション

**決定**: テストファイルは `src/**/*.test.ts` としてプロダクションコードと同じディレクトリに配置する。ビルド出力には含めないため `tsconfig.json` の `exclude` に `src/**/*.test.ts` を追加する。

**理由**: import path が短く (`./client.js` 等)、vitest のデフォルト glob にそのまま乗り、プロダクションコードとテストの対応関係が目視で追いやすい。Node エコシステムの慣例でもある。

**不採用案**: `test/` ディレクトリ集約。import が `../src/client.js` になるか path alias の追加が必要で、小規模 CLI では得るものが少ない。

**参考**: `docs/phase4-test-strategy.md` v3 §4

---

## 2026-04-16 API エラーテスト: 公式仕様準拠の Layer A のみ採用

**決定**: エラーテストは kintone 公式仕様 (`{id, code, message}` の 3 フィールド、cybozu developer network 定義) 準拠のモックで、「HTTP 非 200 → `main()` が 1 を返し stderr に出力」の**配線健全性**のみを Phase 4.1 で検証する。`err.code` の具体値アサーション、`errors` フィールド、bulkRequest 部分失敗等の**構造化アサーションは Layer B として保留**する。HTTP ステータス別の挙動差 (401 vs 403 vs 404) も公式未定義のため保留。

**理由**: 公式 OpenAPI Spec はエラーレスポンスを定義していない (正常系 `"200"` のみ)。公式ドキュメントが明文化しているのは上記 3 フィールドだけで、`errors` や code 体系は JS SDK (`@kintone/rest-api-client`) が事実上の二次リファレンス。現状の `src/client.ts` の `KintoneAPIError` は raw body を `message` に入れるだけの最小実装のため、構造化アサートの対象となるプロパティが存在しない。`KintoneAPIError` を JS SDK 相当に構造化するかは別設計判断として分離する。

**不採用案**:
- エラーテスト全廃: `main()` の exit code 1 経路と `finally` クリーンアップ経路が未検証になる
- 構造化アサーションを即採用: `KintoneAPIError` の構造化設計とセットで議論すべきで、テストだけ先行すると仕様外の決め打ちになる

**参考**: `docs/phase4-test-strategy.md` v3 §4(c), https://cybozu.dev/ja/kintone/docs/rest-api/overview/kintone-rest-api-overview/

---

## 2026-04-16 OpenAPI Spec 活用: リクエスト・コントラクト検証のみ採用

**決定**: Phase 4.2 で OpenAPI Spec ベースの**リクエスト**コントラクト検証 ((1) 案、`ajv` 使用) を導入する。レスポンス fixture vs spec 検証 (1.5)、mock 自動生成 (2)、カバレッジ検知 (3)、`--json` バリデーション (4) は保留 / 後続。`ajv` と YAML パーサは **dev 依存** として入れ、`--json` バリデーション機能が実装された時点で `ajv` を runtime に昇格させる。

**理由**: (1) は自コードのリクエスト構築ミスを検知するのに直結する。(1.5) は spec drift 時にテストがノイズで不安定化するリスクが、自コードのバグ発見への寄与を上回る。(2) はレスポンス形状が spec 通りかは kintone 側の責任領域で、mock に使っても自分のバグは出ない。(4) は `--json` バリデーション機能自体が未実装で、先行して runtime 依存を増やすのは npm 配布物を重くするだけ。

**前提**: Phase 4.2 着手前に 30 分実証で spec 厳密度 (`additionalProperties: true` の多用等で検証が実質ザルにならないか) を主要 3 エンドポイント (`record/get`, `records/get`, `record/post`) で確認する。spec が緩すぎれば (1) の投資判断自体を見直す。

**不採用案**:
- `ajv` を runtime 依存として前倒し投入: `--json` バリデーション未実装の間は npm 配布物に無駄な依存を載せる
- `@stoplight/prism` などの完全 mock サーバ採用: in-test 用途で過剰
- spec 取り込みを non-bundled で行う: external `$ref` 解決ロジックが複雑化するため bundled 版を前提とする

**参考**: `docs/phase4-test-strategy.md` v3 §5, §6, §7
