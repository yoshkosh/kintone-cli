# 設計判断記録（ADR）

設計上の意思決定とその理由を記録する。「なぜそうしたか」を後から振り返れるようにするためのドキュメント。

---

## 2026-03-11 コマンド体系: APIパス準拠

**決定**: kintone REST APIのパス構造にコマンド名を準拠させる。

**理由**: AIエージェント向けCLIとして「予測可能性」を最優先。APIドキュメントを読めばコマンドが推測できる。

**不採用案**: 人間向けエイリアス（`record list` → `records get` 等）。発見しやすさより予測可能性を優先した。

---

## 2026-03-11 OpenAPI Spec: 静的実装 + ランタイム同梱

**決定**: コマンドは静的実装（エンドポイントごとにコードを記述）。OpenAPI Specはランタイムでバリデーション・`--schema`・保守に活用。

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

**参考**: `reports/phase4-test-strategy.md` v3 §1, §2

---

## 2026-04-16 テストスタック: vitest + undici MockAgent (stubGlobal 併用)

**決定**: テストランナーは `vitest`、fetch モックは `undici` の `MockAgent` を採用。各テストで `vi.stubGlobal('fetch', undici.fetch)` により global fetch を userland undici に差し替えてから `setGlobalDispatcher(mockAgent)` を有効化する。CLI はインプロセス方式で起動する (`createProgram()` + `main(argv)` に構造分離、`exitOverride()` で exit code を戻り値化)。

**理由**: vitest は ESM/TS ネイティブで harness 導入コストが低い。`MockAgent` は Node 標準 fetch を declarative にインターセプトでき、ボイラープレート最小。Node 22 のビルトイン fetch は **Node 同梱の undici** を使うため、devDep としてインストールした userland undici の `setGlobalDispatcher` 単独では intercept できない。`vi.stubGlobal` で userland undici に橋渡しすることで `MockAgent` が機能する (`feat/phase4-slice` 試作で検証済)。

**不採用案**:
- `node:test` + 自前 fetch mock: ergonomics が弱く ROI 悪
- `nock` / `msw`: fetch ネイティブの MockAgent が最小フィット
- MockAgent 単独 (`stubGlobal` なし): Node 22 では intercept されず実ネットワークに漏れる
- サブプロセス起動方式: インプロセスより 1 桁遅く、デバッガが刺さらない

**参考**: `reports/phase4-test-strategy.md` v3 §3, §4, `reports/phase4-slice-findings.md` H1〜H5

---

## 2026-04-16 テストファイル配置: コロケーション

**決定**: テストファイルは `src/**/*.test.ts` としてプロダクションコードと同じディレクトリに配置する。ビルド出力には含めないため `tsconfig.json` の `exclude` に `src/**/*.test.ts` を追加する。

**理由**: import path が短く (`./client.js` 等)、vitest のデフォルト glob にそのまま乗り、プロダクションコードとテストの対応関係が目視で追いやすい。Node エコシステムの慣例でもある。

**不採用案**: `test/` ディレクトリ集約。import が `../src/client.js` になるか path alias の追加が必要で、小規模 CLI では得るものが少ない。

**参考**: `reports/phase4-test-strategy.md` v3 §4

---

## 2026-04-16 API エラーテスト: 公式仕様準拠の Layer A のみ採用

**決定**: エラーテストは kintone 公式仕様 (`{id, code, message}` の 3 フィールド、cybozu developer network 定義) 準拠のモックで、「HTTP 非 200 → `main()` が 1 を返し stderr に出力」の**配線健全性**のみを Phase 4.1 で検証する。`err.code` の具体値アサーション、`errors` フィールド、bulkRequest 部分失敗等の**構造化アサーションは Layer B として保留**する。HTTP ステータス別の挙動差 (401 vs 403 vs 404) も公式未定義のため保留。

**理由**: 公式 OpenAPI Spec はエラーレスポンスを定義していない (正常系 `"200"` のみ)。公式ドキュメントが明文化しているのは上記 3 フィールドだけで、`errors` や code 体系は JS SDK (`@kintone/rest-api-client`) が事実上の二次リファレンス。現状の `src/client.ts` の `KintoneAPIError` は raw body を `message` に入れるだけの最小実装のため、構造化アサートの対象となるプロパティが存在しない。`KintoneAPIError` を JS SDK 相当に構造化するかは別設計判断として分離する。

**不採用案**:
- エラーテスト全廃: `main()` の exit code 1 経路と `finally` クリーンアップ経路が未検証になる
- 構造化アサーションを即採用: `KintoneAPIError` の構造化設計とセットで議論すべきで、テストだけ先行すると仕様外の決め打ちになる

**参考**: `reports/phase4-test-strategy.md` v3 §4(c), https://cybozu.dev/ja/kintone/docs/rest-api/overview/kintone-rest-api-overview/

---

## 2026-04-16 OpenAPI Spec 活用: リクエスト・コントラクト検証のみ採用

**決定**: Phase 4.2 で OpenAPI Spec ベースの**リクエスト**コントラクト検証 ((1) 案、`ajv` 使用) を導入する。レスポンス fixture vs spec 検証 (1.5)、mock 自動生成 (2)、カバレッジ検知 (3)、`--json` バリデーション (4) は保留 / 後続。`ajv` と YAML パーサは **dev 依存** として入れ、`--json` バリデーション機能が実装された時点で `ajv` を runtime に昇格させる。

**理由**: (1) は自コードのリクエスト構築ミスを検知するのに直結する。(1.5) は spec drift 時にテストがノイズで不安定化するリスクが、自コードのバグ発見への寄与を上回る。(2) はレスポンス形状が spec 通りかは kintone 側の責任領域で、mock に使っても自分のバグは出ない。(4) は `--json` バリデーション機能自体が未実装で、先行して runtime 依存を増やすのは npm 配布物を重くするだけ。

**前提**: Phase 4.2 着手前に 30 分実証で spec 厳密度 (`additionalProperties: true` の多用等で検証が実質ザルにならないか) を主要 3 エンドポイント (`record/get`, `records/get`, `record/post`) で確認する。spec が緩すぎれば (1) の投資判断自体を見直す。

**不採用案**:
- `ajv` を runtime 依存として前倒し投入: `--json` バリデーション未実装の間は npm 配布物に無駄な依存を載せる
- `@stoplight/prism` などの完全 mock サーバ採用: in-test 用途で過剰
- spec 取り込みを non-bundled で行う: external `$ref` 解決ロジックが複雑化するため bundled 版を前提とする

**参考**: `reports/phase4-test-strategy.md` v3 §5, §6, §7

---

## 2026-05-02 `--schema` オプション

**決定**: 各エンドポイントコマンドに `--schema` を追加し、OpenAPI Spec の該当 operation を `{ method, path, operation }` 形式の compact JSON で標準出力に吐く。`--schema` 指定時は **完全副作用ゼロ**（必須オプション検証・`noGuestSpace` ガード・API 呼び出しを全てスキップ）。早期終了は `process.exit` ではなく `CommanderError(0, "schema.output", "")` を throw して既存 `main()` の `exitOverride()` catch 経路に乗せる（テストで `process.exit` の副作用を避けるため）。`--guest-space-id` を併用しても通常パス（`/k/v1/...`）の schema を返す（guest テンプレートは spec 上同一 operation を共有しているため別出しの意味がない）。`--dry-run` と同時指定された場合は `--schema` を優先し、dry-run 出力は行わない。

**理由**: AI エージェントが「このコマンドが期待する parameters/requestBody」を実 API を叩かずに取り出せるようにするため。spec を一次ソースとして CLI 内で配るのが最も予測可能性が高い（外部の cybozu developer network 等を都度参照させずに済む）。副作用ゼロは「schema 取得には認証も実環境も不要」という呼び出し側の素直な期待と整合させるため。

**実装**:
- ビルド時に `third_party/rest-api-spec/openapi.yaml` を JSON 化して `dist/spec.json`（npm パッケージ同梱）と `src/spec.json`（test/`import.meta.url` 解決用、`.gitignore`）の両方に書き出す。
- `attachEndpoint(cmd, { method, path })` でコマンドにエンドポイントメタを付与（`WeakMap` で外部管理。Command 型を汚染しない）。
- `installSchemaOption(program)` を `cli.ts` の `createProgram` 末尾で呼び、メタ付きコマンドに `--schema` オプションと `preAction` フックを後付けする。
- `requireOpts(opts, names)` ヘルパーで `requiredOption` 相当の検証を action 内に移し、`opts.schema` が立っていればスキップ。`noGuestSpace(global, name, opts)` も同様に `opts?.schema` を見て早期 return。

**不採用案**:
- `process.exit(0)` で終了: vitest がテストランナーごと落ちる。`CommanderError` throw なら exitOverride 配下で素直に exit code を返せる。
- `requiredOption` のままにして `preValidate` で介入: commander の必須検証は action 直前に走るので、フック側で「実はオプション不要」を表現する標準的な手段がない。`option` に降格して action 内検証にした方が制御が明確。
- guest path をテンプレートで返す: spec 上 `/k/guest/{guestSpaceId}/...` 用の独立 operation がある場合と通常パスと同一の場合が混在しており、利用側の混乱を避けるため通常パスに統一。
- `--describe`: 出力が「コマンドのパラメータ要約」なら適切な名前だが、実際に出すのは spec の operation そのものなので `--schema` の方が誤解が少ない。
- 動的引数なし `kt --schema`: 第一弾は対象スコープが曖昧（全エンドポイント？ ヘルプ？）なので保留。

**参考**: `reports/schema-option-plan.md` v2、`reports/plan-review-cc.md`

---

## 2026-05-02 `--json` ペイロードのバリデーション

**決定**: `--json` を持つ全エンドポイントコマンドで、`JSON.parse` 直後のペイロードを OpenAPI Spec の requestBody（DELETE 系のみ parameters）で検証する。Ajv (`strict: false, allErrors: true, coerceTypes: true, logger: false`) を runtime 依存に昇格して採用。`additionalProperties: false` はトップレベルにのみ注入し、`record` 配下のユーザー定義 field code は許容する。検証失敗時は **stderr に JSON 形式**で出力（`{ error: "json_validation_failed", method, path, errors }`）し exit 1。`--skip-validation` でバイパス可能だが、利用時は stderr に notice を出して常用化を発見できるようにする。`--dry-run` でもバリデーションは走る（dry-run の意味を「呼ばずに validate」に近づける）。`--schema` 指定時は `preAction` で early exit するため validation も走らない（副作用ゼロは維持）。

**CLI エラー出力規約の例外**: 従来 CLI 側エラー（引数不正・認証未設定）はテキスト出力だが、validation 失敗のみ JSON 形式に拡張。CLI / API の弁別は `error` キーの有無で行う（API エラーは kintone のレスポンス JSON をそのまま透過するため `error` キーを持たない）。`JSON.parse` 失敗（不正 JSON）は構文ミスであり validation 違反とは性質が異なるため、引き続きテキスト出力。

**実装**:
- `src/endpoint-registry.ts` に `endpointMetaMap` / `attachEndpoint` / `walkAll` を切り出し、`schema-option.ts` と `validator.ts` 双方から共有（循環依存回避）。
- `src/validator.ts` で `validateJsonOrThrow(cmd, opts, body, { mode })` を export。Ajv 実体・component schemas の `addSchema`・compiled validator のキャッシュは初回呼び出し時に lazy 初期化（`--schema` のみの経路では Ajv を一切ロードしない）。
- `installSkipValidationOption(program)` を `cli.ts` で呼び、`walkAll` で `endpointMetaMap` 登録済かつ `--json` を持つコマンドに `--skip-validation` を一括注入する（個別追加を避け、新規 endpoint 追加時の取りこぼし防止）。
- `coerceTypes` による mutation は `structuredClone(body)` 上に閉じる。実送信 payload は補正せず原型のまま `kintoneRequest` に渡す（kintone 側は文字列の数値も受容するため）。
- `src/__test-helpers__/spec-validator.ts` は `validator.ts` の `compileForEndpoint` を内部利用する薄い wrapper に書き換え。guest path 正規化と `ids[i]` 逆展開と GET query 検証は test-helper 側に保持（runtime には流入させない）。

**不採用案**:
- `--skip-validation` を 31 コマンド個別に option 追加: 新規 endpoint で取りこぼしリスク。`installSkipValidationOption` 一括注入に統一。
- `coerceTypes` を切って厳密化: kintone 側の柔軟な型受容と乖離し過剰検出になる。境界は `cli.test.ts` で fixture 化して可視化。
- format 検証の有効化: kintone spec の `format` は `long` / `date-time` / `boolean` / `number` / `query` 等の非標準値が多く、`ajv-formats` も独自 format も登録しない方針。`logger: false` は format warning 抑制であって format 検証ではない。
- レスポンス側の検証: kintone 側責任のため引き続きスコープ外（2026-04-16 ADR を踏襲）。
- bulkRequest 内部の個別 `(method, api)` ↔ payload schema マッチング: spec が anyOf で 8 種列挙するのみで対応関係を表現していないため、本機能スコープ外。後続課題として `docs/ideas.md` に持ち込む。

**ドキュメント表記と install ツールの差異**: ドキュメントは `yarn` 系で表記する一方、実 install / 実行は `pnpm-lock.yaml` 準拠（pnpm）で行う。プロジェクト CLAUDE.md の規約。

→ **2026-05-05 改定**: README（エンドユーザー向け install 手順）のみ `npm install -g` / `npx` 表記に変更。理由は下記 ADR 参照。

**参考**: `reports/json-payload-validation-spec.md`、`docs/decisions.md` 2026-04-16「OpenAPI Spec 活用: リクエスト・コントラクト検証のみ採用」

---

## 2026-05-03 bulkRequest 内部 payload の sub-schema 検証

**決定**: `bulk-request add --json` のペイロードに対して、`requests[i].payload` を `(method, api)` から決まる sub-schema で個別検証する **二段検証 (X2)** を採用する。トップレベル schema は **`payload.anyOf` を外して「外形のみ」に弱め**、payload 検証は二段目に全委譲する。`requests[i]` 各 entry には `additionalProperties: false` を注入して entry レベルの余分プロパティ (`{method, api, payload, comment}` 等) も検出する。`(method, api)` → sub-schema 名のマップは `src/bulk-request-schemas.ts` の `BULK_SUB_API_MAP` (8 エントリ) として明示的にリテラル定数で持つ。`method` は `POST/PUT/DELETE` の完全一致 lookup のみ許容し、lower-case (例: `post`) は `bulkRequestUnknownSubapi` として弾く。

**理由**: 既存の anyOf-only 検証では `record` 用 payload に `BulkRequestPostRecordsDeleteForm` 互換の偶然な構造が混入しても通ってしまい、エラーメッセージも「anyOf のどれにも一致しない」止まりで AI エージェントが原因特定しづらい。プロジェクト CLAUDE.md の「正確性を実装の簡易さより優先」原則に直結する。

**X2 採用の根拠** (代替案: トップ既存維持 + sub も走らせる X1、ajv カスタムキーワード等):

- X1 は同じ payload に対して anyOf 8 種違反 + sub-schema 詳細違反が両方積まれて重複ノイズが多い
- X2 はエラー UX が一貫する (unknown も typo も二段目だけが出す)。`payload: {}` のような unknown ケースも二段目に到達できる
- ajv カスタムキーワード方式は spec が discriminator を使っていないため独自規約が増える

**実装**:
- `src/bulk-request-schemas.ts` で `BULK_SUB_API_MAP: ReadonlyMap<string, string>` (8 エントリ) と `resolveBulkSubSchema(method, api)` を export
- `src/validator.ts` に以下を追加:
  - `compileForBulkSub(name)`: `getComponentSchemas()[name]` を **clone** → `tightenTopLevel` → `getAjv().compile`、`bulk:${name}` でキャッシュ
  - `compileForBulkTop()`: bulkRequest top schema を clone → `BulkRequestPostRequestForm` を inline 展開して payload を `{type:"object"}` に縮め、`additionalProperties:false` を注入 → `tightenTopLevel`、`bulk:top` でキャッシュ
  - `validateBulkRequestSubPayloads(data)`: `requests[]` を走査し、`(method, api)` 不明なら `bulkRequestUnknownSubapi` を 1 件積む (params に method/api を載せる)。一致したら `compileForBulkSub` で payload 検証し、`/requests/i/payload${ajvInstancePath}` の単純連結で entries を返す
  - `JsonValidationError.fromEntries(method, apiPath, entries)` static factory を追加 (top + sub の合算 entries を 1 つの例外にまとめる)
  - `validateJsonOrThrow` の末尾で `meta` が `POST /k/v1/bulkRequest.json` のときだけ X2 専用パスへ分岐
- マップ整合性は `src/spec.test.ts` の S1 (`anyOf` の `$ref` 名集合 == `BULK_SUB_API_MAP` の値集合) と S2 (`Map.size == 8`) で検査

**不採用案**:
- spec 由来のマップ自動抽出 (命名規則ベースで sub-schema 名 → `(method, api)` を逆引き): spec 命名が崩れた瞬間に黙って壊れる。明示的なリテラル定数の方が予測可能性が高い
- spec 動的書き換え (`if (method=X, api=Y) then $ref=...` で組み直す): 認知負荷が高くエラーパスが読みにくい
- 二段目を呼ばずに anyOf 由来エラーだけで済ます: 「payload は anyOf のどれにも一致しない」止まりで AI が原因特定しづらい (本機能の動機そのもの)
- bulkRequest 専用 `--skip-bulk-validation` の新設: 個別 sub-request だけ skip するユースケースは想像しにくく、既存 `--skip-validation` で十分
- spec 自体が表現していない制約 (PUT 系の `id`/`updateKey` 二者択一、`requests` 件数 20 上限) の CLI 側先回り検証: spec 一次ソース原則と整合しない (kintone 側で明確なエラーが返る)
- `record.<field code>` 配下のユーザー定義フィールド値検証: `tightenTopLevel` がトップだけに発火する設計を踏襲。アプリスキーマ取得との連携は別課題

**X2 採用前の妥当性ゲート**: 着手前に `experiment/bulk-request-spec-probe.mjs` で 8 sub-schema を `tightenTopLevel` 注入後に検証し、必須欠如・型違反・余分プロパティの 3 軸 24 ケース全てを検出 (24/24)。`reports/bulk-request-validation-findings.md` に記録。

**参考**: `reports/bulk-request-validation-plan.md`、`reports/bulk-request-validation-findings.md`、上の 2026-05-02「`--json` ペイロードのバリデーション」

---

## 2026-05-03 最小 Node を 22 に設定

**決定**: `package.json` の `engines.node` を `>=22` とする。0.6.0 の npm 公開と同時に明示する。

**理由**:
- ランタイムで Node の **built-in `fetch`** に依存している（`undici` を runtime には載せていない）。`fetch` は Node 18 で experimental として導入され、Node 21 で stable 化した。Node 22 は LTS でこれを引き継ぐ最初のラインであり、`fetch` を要件として宣言する最低ラインを 22 に置くのが素直。
- Node 20 LTS は **2026-04-30 に active maintenance を終了** し security メンテのみとなる。新規プロジェクトとして公開するタイミングで Node 20 を最小に据える積極的理由がない。
- AI ツール群の現場には Node 20.x が残っているが、README で「`nvm use 22` 等で切り替え」を案内する方針（リリース計画 A2）。

**不採用案**:
- `>=20`: 上記理由により built-in fetch / MockAgent の挙動差を巻き取る価値が薄い。
- `>=22.11`（22 LTS の特定マイナー固定）: マイナー粒度の刻みは依存上の必然がない。

**参考**: `prompts/release-plan.md` HIGH 8

---

## 2026-05-05 README のエンドユーザー向け install 表記を npm に統一

**決定**: README.md / README.ja.md のグローバルインストール手順を `yarn global add` から `npm install -g` に変更する。スキル配置例の `$(yarn global dir)/node_modules/...` も `$(npm root -g)/...` に揃える。`kt` の PATH 衝突説明文中の `yarn global` 例示も `npm install -g` に置換。

**理由**:
- end-user は npm を素手で持っている前提の方が現実的（npm は Node 同梱、yarn は別途 install が必要）。
- 公開先が npmjs.org であり、scope (`@yoshkosh`) も npm 規約。`npm install -g` の方が公開チャネルとの整合が良い。
- yarn 表記は「ドキュメントは yarn」というプロジェクト CLAUDE.md の規約由来だが、これはコントリビューター向け開発手順の表記ルールであって、エンドユーザーが「最初に動かす」手順とは目的が違う。

**スコープ**:
- 変更対象: README.md / README.ja.md（end-user 向け）。
- 維持: AGENTS.md / `.claude/CLAUDE.md` ローカル / 過去の `docs/log.md` エントリ（コントリビューター向けまたは履歴）。AGENTS.md は pnpm をカノニカル、yarn を Corepack 経由の代替として記載済み。
- 既存の 2026-05-02 ADR（line 268 サブノート）に「2026-05-05 改定」の参照を追記。

**実装**:
- README.md の 4 箇所（install / PATH 衝突説明 / SKILL.md 登録手順 ×2）を置換。
- README.ja.md の対応する 4 箇所を同様に置換。
- `prompts/release-plan.md` A2 の install 表記も npm に統一（私的な計画書だが、Phase 4 以降の判断ブレを防ぐため）。

**参考**: `prompts/release-phase-3.md`、Phase 3 作業ログ（`docs/log.md` 該当エントリ）
