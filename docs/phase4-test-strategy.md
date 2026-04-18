# Phase 4 (テスト) 戦略議論 v3

日付: 2026-04-15 (v1)
改訂: 2026-04-15 (v2 — `reports/phase4-test-strategy-review.md` の指摘を反映)
改訂: 2026-04-16 (v3 — `docs/phase4-slice-findings.md` の試作結果とエラー仕様調査を反映)
文脈: docs/ideas.md の「テスト」項目について Phase 4 の方向性を整理した議論メモ。**最終決定ではなく検討記録**。確定後に decisions.md と spec.md へ反映する想定。

---

## v1 → v2 の主な変更

v1 のレビュー (`reports/phase4-test-strategy-review.md`) を受けて以下を修正:

- **必須**: Phase 4.0 の前提タスクとして `src/index.ts` の構造分離を明記 (§8)
- **必須**: Phase 4.0 を 4.0a / 4.0b に分割 (§8)
- **必須**: `ajv` を Phase 4.2 では **dev 依存** とする (§6)
- **必須**: Phase 4 から OAuth 実挙動テストを除外 (§4, §8, §9)
- **必須**: Tier 2 の運用条件を定義し「リリース前手動スモーク」に絞る (§2)
- **強く推奨**: Phase 4.2 の初手は (1) のみ。(1.5) は保留 (§5)
- **強く推奨**: Phase 4.2 前に spec 厳密度の事前検証タスクを追加 (§5, §8)
- **強く推奨**: bundled spec 採用を前提条件として明記 (§7)
- **推奨**: submodule vs コピー運用の再検討 (§7)
- **推奨**: NDJSON ストリーミングテスト専用ヘルパを Phase 4.1 に明記 (§4, §8)
- **推奨**: エラーパス (base URL / 認証 / ネットワーク / 429) を Phase 4.1 に追加 (§4, §8)
- **推奨**: `js-yaml` vs `yaml` 選定の再確認 (§3)
- **推奨**: テスト対象外 / 実行時間目標 / カバレッジ方針を明記 (§9〜§11)
- **推奨**: `vendor/` の命名再検討 (§7)

---

## v2 → v3 の主な変更

`docs/phase4-slice-findings.md` の試作結果とエラー仕様の一次ソース調査を反映:

- **必須**: §3 の fetch モック採用を「undici `MockAgent` + `vi.stubGlobal('fetch', undici.fetch)` の併用」に修正。Node 22 のビルトイン fetch は同梱 undici を使うため、userland undici (devDep) の `setGlobalDispatcher` だけでは intercept できない。各テストで global fetch を userland `undici.fetch` に差し替えてから MockAgent を有効化する
- **必須**: §4 に新サブセクション (c) を追加し、**API エラーレスポンスのモデルと情報源** を明記。公式定義は `{id, code, message}` の 3 フィールドのみ (cybozu developer network)。HTTP ステータスコードの使い分け・`errors` フィールド・bulkRequest 部分失敗・code 体系は**公式未定義**であり、JS SDK (`@kintone/rest-api-client`) が事実上の二次リファレンス
- **必須**: §4 と §8 Phase 4.1 のエラー系テスト観点を **Layer A のみ** (HTTP 非 200 → `main()` が 1 を返し stderr に出力) に限定。`code === "CB_XX00"` 等の構造化アサーションや `errors` / bulkRequest は **Layer B 以降** として Phase 4.1 スコープから分離 (現状の `KintoneAPIError` が raw body を message に入れているだけのため、構造化するかは別設計判断)
- **推奨**: §8 Phase 4.0a + 4.0b を「完了 (feat/phase4-slice で試作、H1〜H5 検証済)」としてマーク。試作ブランチ `feat/phase4-slice` と `docs/phase4-slice-findings.md` への参照を明記
- **推奨**: §4 に `mockAgent.assertNoPendingInterceptors()` の注記を追加 (undici 8.1.0 では `MockPool` 上には存在せず `MockAgent` 上のみ)
- **推奨**: §10 に試作での実測値 (起動 OH ~400ms、純テスト合計 ~18ms) を記録

---

## 結論サマリ

- **テスト基本方針**: HTTP モック中心 (Tier 1) + 限定的な実 API **手動スモーク** (Tier 2)
- **Phase 4 を 4 段に分割**: 4.0a (harness + ピュアユニット) / 4.0b (統合 1 ケース) / 4.1 (テスト拡充) / 4.2 (spec 統合)。**4.0a + 4.0b は 2026-04-16 に `feat/phase4-slice` で試作完了 (findings 参照)**
- **Phase 4.0 の前提**: `src/index.ts` を `createProgram()` + `main(argv)` へ構造分離 (完了)
- **fetch モック**: undici `MockAgent` + `vi.stubGlobal('fetch', undici.fetch)` の併用 (Node 22 のビルトイン fetch 対策)
- **API エラーのモデル**: 公式仕様 `{id, code, message}` (3 フィールド) に準拠。構造化アサーションは Layer B 以降として分離
- **依存追加**: dev 4 (`vitest`, `undici`, `ajv`, `js-yaml` or `yaml`) + runtime 0
- **OpenAPI Spec 活用**: (1) リクエスト・コントラクト検証のみ採用 (Phase 4.2)。(1.5) は保留

---

## 1. テスト層の戦略

このCLIは **薄い変換層** (引数 → URL/ヘッダ/ボディ構築 が処理の大半)。kintone REST API 自体は外部契約。

**結論**: モック中心が妥当。

**根拠**:

- リクエスト構築の正しさはモックで完全検証可能
- kintone は後方互換に厳しいエンタープライズ製品で、サイレントな破壊的変更は稀
- OpenAPI Spec が一次ソースとして存在し、コントラクトテストで補える
- テストアプリの状態管理 (setup/teardown、データ汚染対策) は ROI が悪い
- ドッグフーディングと利用者フィードバックが、夜間 E2E より早く回帰を検知する場合が多い

## 2. 実 API テストの位置付け (Tier 2)

モックだけでは取りこぼす領域も実在する:

- ファイル multipart upload/download (モックの忠実度に限界)
- カーソルページネーションの境界 (cursor 期限切れ等)
- 日本語/特殊文字エンコーディング、429 レート制限の挙動
- OpenAPI Spec と実 API の乖離 (spec が常に正しいとは限らない)

※OAuth refresh トークンの実挙動は、**OAuth 実装完了までテスト対象外** (現状 `src/auth.ts:95` で未実装)。OAuth 実装後に Tier 2 対象へ追加する。

### 運用条件 (v2 追加)

v1 は「5〜10 ケースの夜間 or リリース前スモーク」と数だけ示し、運用設計が欠落していた。v2 では以下に絞る:

- **実行主体**: **ローカルでリリース前に手動実行** (夜間 CI は採用しない)
- **秘密情報の供給**: 既存運用 (`docs/decisions.md` 2026-03-24: direnv + macOS Keychain) をそのまま利用。CI で回さないため GitHub Actions Secrets 運用は不要
- **テストデータ**: メンテナ個人の検証 tenant を使用。専用 tenant の運用コストは負わない
- **blocking**: 失敗は release blocker。通常リリース前に全件 green を確認
- **数の目安**: 5〜10 ケース、実行 1〜3 分を上限

**全コマンド網羅の E2E は ROI が悪く不採用**。

役割分担:

- **spec 検証 (Tier 1)**: 自分の実装ミスを検知
- **実 API (Tier 2)**: spec 自体の乖離を検知

※CI 化が必要になった時点で、Secrets 運用方針を `docs/decisions.md` に別途 ADR として記録する (現 direnv + Keychain 運用と原理的に衝突するため)。

## 3. テストスタック

### 採用

- **`vitest`**: ESM/TS ネイティブ、watch 高速、describe/expect 標準的
- **`undici` MockAgent + `vi.stubGlobal('fetch', undici.fetch)` の併用** (v3 修正): Node 標準 `fetch` (`src/client.ts:66`) を intercept。ただし Node 22 のビルトイン `fetch` は **Node 同梱の undici** を使うため、devDep としてインストールした userland undici の `setGlobalDispatcher(mockAgent)` だけでは intercept できない。各テストの `beforeEach` で `vi.stubGlobal('fetch', undici.fetch)` により global fetch を userland 側に差し替えてから MockAgent を有効化する。この配線は `feat/phase4-slice` の試作で検証済 (`src/cli.test.ts` 参照)
- **YAML パーサ**: `yaml` または `js-yaml`。`yaml` の方が ESM ネイティブで型定義本体同梱 (`@types/*` 不要) のため有利。Phase 4.2 着手時に最終選定

### 検討して落とした選択肢

- **`node:test` + 自前 fetch mock**: 依存ゼロだが ergonomics が弱く ROI 悪い
- **`nock` / `msw`**: fetch ネイティブの undici MockAgent が最小フィット
- **`@apidevtools/swagger-parser`**: spec 全体検証は不要。ajv 自身が `$ref` を内部解決できる
- **`@stoplight/prism`**: 完全な mock サーバ (Express ベース) は in-test 用途で過剰

## 4. テスト構造を 2 階層に分ける

### (a) ピュアユニット (HTTP モック不要)

`src/client.ts` / `src/commands/shared.ts` の純粋関数:

- `buildPath('/k/v1/record', 5)` → `/k/guest/5/v1/record`
- `appendQueryParams` の配列展開 (`fields[0]=...`)
- `noGuestSpace` のガード発動
- `toGuestSpaceId` の文字列→数値変換

→ shared 層のロジックバグを最速で検知

### (b) HTTP モック層 (コマンド統合)

コマンド全体を起動し、`kintoneRequest` が出す HTTP リクエストと stdout 出力を検証。

検証観点:

- 認証ヘッダ (`X-Cybozu-Authorization` / `X-Cybozu-API-Token`)
- メソッド・パス・クエリ・ボディの組み立て
- `--guest-space-id` でパスが `/k/guest/5/v1/...` に変わる
- `--fields` マスクの絞り込み
- `--page-all` で cursor API を踏んで NDJSON が 1 行ずつ出る (§8 の NDJSON ヘルパ前提)
- API エラーが stderr に透過、exit code 1
- `--dry-run` で HTTP リクエストが発火しないこと
- **`--auth-type` 明示時の選択挙動 + 複数検出時の warning (v2 追加)**
- **OAuth 指定時の明示エラー `OAuth is not yet implemented.` の throw 検証 (v2 追加、実挙動は OAuth 実装後)**
- **`KINTONE_BASE_URL` 未設定時のエラー (v2 追加)**
- **認証情報未設定時のエラー (v2 追加)**
- **ネットワークエラー (`fetch` が throw) の透過 (v2 追加)**
- **429 レート制限時の即失敗 (v2 追加、現状 retry なし。明文化のためテスト化)**

**注記 (v3)**: interceptor の実発火確認には `mockAgent.assertNoPendingInterceptors()` を使う。undici 8.1.0 では `MockPool` 上には同メソッドは存在せず `MockAgent` 上のみ。

### (c) API エラーレスポンスのモデルと情報源 (v3 新規)

公式 OpenAPI Spec (`kintone/rest-api-spec`) は **正常系 (`"200"`) のみを定義**。エラーレスポンスの形状、HTTP ステータスコードの使い分け、`errors` フィールド、bulkRequest 部分失敗の形式はいずれも Spec には定義されていない (実地確認済)。

**一次ソース (cybozu developer network の "REST API の共通仕様" ドキュメント)** が定義しているのは以下の 3 フィールドのみ:

```json
{
  "id": "1505999166-897850006",
  "code": "CB_IJ01",
  "message": "不正なJSON文字列です。"
}
```

- `id`: ユニーク識別子 (サポート問い合わせ用)
- `code`: エラー種別コード
- `message`: メッセージ (言語はユーザ設定依存)
- HTTP ステータスは **「200 番台 = 成功、それ以外 = 失敗」のみ明記**。4xx / 5xx 個別の使い分けは未定義

**二次リファレンス (`@kintone/rest-api-client` / JS SDK)**: `KintoneRestAPIError` が以下の拡張モデルを事実上の標準として提供:

- `errors` (任意): フィールドレベルバリデーション詳細
- `BulkRequestErrorResponseData`: `{ results: Array<SingleErrorResponseData | {}> }` (`{}` は該当サブリクエストが成功)
- 整形メッセージ: `[${status}] [${code}] ${message} (${id})`

Cybozu 公式製のためエラー挙動の**事実上のリファレンス**として信頼性は高いが、あくまで Spec 外の二次ソース。

### エラーテストの Layer 分け (v3 新規)

現状の `src/client.ts:69-73` の `KintoneAPIError` は raw body を `message` に入れるだけの最小実装。エラーテストは以下の 2 層に分割:

| Layer | 検証内容 | 採否 | 根拠 |
|---|---|---|---|
| **A. 配線の健全性** | HTTP 非 200 → `main()` が 1 を返し stderr に何か出る。`record get` の `finally` で cursor 削除が走る等の経路カバー | **Phase 4.1 で採用** | 公式仕様 `{id, code, message}` で十分表現でき、1 ケースで実装経路の回帰を検知できる |
| **B. エラー body の構造化アサーション** | `err.code === "CB_NO02"` / `err.errors` の shape 検証 / bulkRequest 部分失敗のインデックス追跡 | **Phase 4.1 では保留** | `KintoneAPIError` の構造化は別設計判断 (JS SDK 相当への拡張)。現状の実装では assertion 対象そのものが存在しない |
| **C. HTTP ステータス別の挙動差** | 401 vs 403 vs 404 での挙動差 | **保留** | 公式が具体ステータスを明文化していない。テストを具体値に依存させると仕様外の決め打ちになる |

**Layer A のモックレスポンス標準**:

```ts
// 公式仕様準拠: {id, code, message} のみ使用
pool.intercept({ path, method }).reply(403, {
  id: "test-id",
  code: "CB_NO02",
  message: "No privilege to proceed.",
});
```

Layer B / C が必要になったタイミング (= `KintoneAPIError` の構造化を入れた時) で、本セクションを更新してテストを追加する。**Layer B のフィクスチャには `// JS SDK 由来の拡張 (公式仕様外)` のコメントを付けて一次/二次ソースの区別を明示**する。

### CLI 起動方式

**前提タスク (v2 追加)**: 現状の `src/index.ts:51` はモジュール評価時に `program.parseAsync()` を実行するため、インプロセステストと非互換。`vi.resetModules()` でも解決しない (import で parse が走る)。Phase 4.0a 着手前に以下の構造分離が必要:

```ts
// src/cli.ts
export const createProgram = (): Command => {
  const program = new Command();
  // 現在 src/index.ts の program 構築 (name/description/option/command 登録) を関数化
  return program;
};

export const main = async (argv = process.argv): Promise<number> => {
  const program = createProgram();
  program.exitOverride();
  try {
    await program.parseAsync(argv);
    return 0;
  } catch (err) {
    // stderr 出力 (KintoneAPIError の透過等、既存の動作を維持)
    return 1;
  }
};

// src/index.ts (bin エントリ、1〜2 行)
main().then((code) => process.exit(code));
```

テスト側では:

- `createProgram()` または `main(customArgv)` をインプロセスで呼ぶ
- `exitOverride()` で終了コードを戻り値として検証 (`process.exit` spy に依存しない)
- `vi.spyOn(process.stdout, 'write')` で出力捕捉
- `process.env` は各テストで `vi.stubEnv()` を使いリセット

**理由**: サブプロセス起動より 1 桁速く、デバッガが刺さる。commander singleton `program` の蓄積問題も回避できる。

## 5. OpenAPI Spec の活用

検討した 4 つの活用方式 + ハイブリッド案:

| 案 | 内容 | 採用判断 |
|---|---|---|
| (1) リクエスト・コントラクト検証 | モックインターセプト時に ajv で request の path/query/body が spec に適合するか検証 | **採用** (Phase 4.2 初手) |
| (1.5) ハイブリッド | 手書き fixture が spec の response schema に適合するか後付け検証 | **保留** (v2 で格下げ) |
| (2) レスポンス mock 自動生成 | spec から example 生成して mock レスポンスにする | **drop** |
| (3) カバレッジ検知 | spec の全エンドポイントに対応するテストが存在するか検証 | 後続 (4.1 後) |
| (4) `--json` バリデーションのテスト | spec 違反ペイロードが拒否されることを検証 | 後続 (機能実装後) |

### (1.5) を保留に格下げした理由 (v2 追加)

v1 では「追加 dep ゼロ」「drift 検知可能」として採用していたが、再検討の結果:

- fixture を書く時点で spec を参照するなら、検証時に改めて通すのは同語反復に近い
- drift 検知として機能するのは spec が変わった時のみ。そしてその時、**テストが突然失敗しても「spec が変わった」事実しか分からず、自分のコードのバグではない**
- 混乱を招くノイズになるリスクが、バグ発見への寄与を上回る

→ Phase 4.2 初手では (1) のみ採用。実際に spec drift を検知したい動機が出てきたタイミングで (1.5) を追加する。

### (2) を drop した詳細理由 (v1 から継続)

1. **検証対象がそこにない**: kintone のレスポンス形式が spec 通りかは kintone 側の責任。我々のコードはほぼ pass-through なので、spec 由来 mock を流しても自分のバグは出ない
2. **本当に検証したいのは別物**: `--fields` フィルタ、NDJSON ストリーム、エラー透過 — いずれも意図を持って手書きされた fixture が読みやすい
3. **ツールが不適**: prism は重く、json-schema-faker の生成データは kintone のフィールド型 (e.g. SUBTABLE) を再現しない
4. **drift 検知としても筋が悪い**: mock 自体が spec 由来なので、自分のテストでは drift を捕まえられない (drift 検知は Tier 2 の役割)

### spec 厳密度の事前検証 (v2 追加)

(1) は spec が厳密に記述されていることが前提。もし kintone の spec で `additionalProperties: true` / 広い `oneOf`・`anyOf` / 不十分な `required` が多ければ、検証が実質ザルになる。

**Phase 4.2 着手前に 30 分程度で実証タスクを挟む**: `kintone/rest-api-spec` の `record/get` / `records/get` / `record/post` など主要 3 エンドポイントを ajv に食わせて、意図的に壊したリクエスト (余計なフィールド / 必須欠如 / 型違反) を検出できるか確認。spec が緩すぎれば (1) の投資判断自体を見直す。

## 6. 依存パッケージの最終形 (v2 更新)

| パッケージ | 段階 | 種別 | 用途 |
|---|---|---|---|
| `vitest` | 4.0 | dev | テストランナー |
| `undici` | 4.0 | dev | MockAgent で global fetch をインターセプト |
| `ajv` | 4.2 | **dev** | spec ベースのコントラクト検証 (テスト用途のみ) |
| `yaml` or `js-yaml` | 4.2 | dev (build-time) | spec の YAML→JSON 変換、1 度だけ |

→ 計 dev 4 + runtime 0。現状 (dev 2 / runtime 1) から **dev +2 のみ、runtime は増やさない**。

**v1 からの変更**: `ajv` を runtime → dev に格下げ。`--json` バリデーション機能 (`docs/ideas.md` 検討中) が実装されたタイミングで runtime に昇格させる (その時点で意思決定を再訪)。**npm 配布物 (`files: ["dist"]`) に未実装機能のための依存を載せない**。

## 7. spec の取り込み方法

ideas.md の 2026-04-07 議論で「Git submodule で参照」と初期決定されていたが、v2 では以下を再検討する必要がある。

### (a) submodule 運用 vs コピー運用 (v2 追加)

| 方式 | メリット | デメリット |
|---|---|---|
| submodule | spec バージョンの追跡が自動 | `actions/checkout@v4 submodules: recursive` / `git clone --recurse-submodules` が必要。忘れるとビルド失敗 |
| コピー (~86.3KB をコミット) | clone 一発で動く。diff が PR で見える | 手動更新、履歴は自リポジトリに閉じる |

**単独メンテの CLI ならコピー運用の方が運用コストが低い可能性が高い**。`docs/ideas.md` の初期決定を再訪し、Phase 4.2 着手前に最終結論を出す。

### (b) bundled vs 非 bundled spec (v2 追加)

`docs/ideas.md` でも「`bundled/openapi.yaml` か `openapi.yaml` か」が未決。

- **非 bundled**: external `$ref` 解決 / schema ID 整理 / request-response schema の抽出ロジックが複雑化
- **bundled**: ajv に食わせるだけで済む

**Phase 4.2 前提として bundled 版を採用**。bundled 版が `kintone/rest-api-spec` に存在し利用可能であることを Phase 4.2 着手前に確認する (破綻していれば「spec 取り込み設計」をサブフェーズとして切る)。

### (c) 配置ディレクトリの命名 (v2 追加)

v1 で候補とした `vendor/rest-api-spec/` の `vendor/` は Ruby/Go の慣習。Node.js では `third_party/` / `external/` / `.spec-cache/` 等が一般的。命名は些細だが、submodule 採用時はパス変更で再設定が必要になるため最初に決める。**`third_party/rest-api-spec/` を有力候補**として Phase 4.2 着手前に決定。

### npm 配布

- `@kintone/rest-api-spec` は **npm 未公開** (registry 404 で確認)
- リポジトリ: `kintone/rest-api-spec` (Apache 2.0)
- npm 配布物 (`@yoshkosh/kintone-cli`) には submodule/vendor は届かないため、**ビルド時 YAML→JSON 変換 → `dist/spec.json` として同梱が必須**

---

## 8. Phase 4 の段階分け (v2 再構成)

### Phase 4.0 前提: `src/index.ts` 構造分離 (v2 新規、v3 で **完了**)

**harness 構築タスクと同列ではなく、前提タスク**。**2026-04-16 に `feat/phase4-slice` ブランチで完了 (`src/cli.ts` / `src/index.ts`)。詳細: `docs/phase4-slice-findings.md` H1**。

- `src/index.ts` から `createProgram(): Command` と `main(argv): Promise<number>` を分離
- bin エントリ (`src/index.ts`) は `main().then(code => process.exit(code))` の 1〜2 行に
- `exitOverride()` で終了コードを戻り値化
- プロトタイプ 15 分で動作確認 → 既存 CLI 挙動に回帰がないこと (smoke 5/5 pass)

### Phase 4.0a: harness 立ち上げ + ピュアユニット (v3 で **完了**)

**2026-04-16 に試作で完了。findings H5 参照**。

- vitest セットアップ (config、`test` script)
- shared 層ピュアユニット 2〜3 ケース (HTTP モック不要)
- dogfooding してハーネス健全性を確認

→ vitest が動くことを最小単位で証明。**undici MockAgent を導入しないことで、harness の問題とテストコードの問題を切り分けやすい**

### Phase 4.0b: undici MockAgent + 統合 1 ケース (v3 で **完了**)

**2026-04-16 に試作で完了。findings H2〜H4 参照**。試作では happy path 2 ケース (通常 + `--guest-space-id`) まで検証済。

- undici MockAgent + `vi.stubGlobal('fetch', undici.fetch)` ヘルパ (global dispatcher 差し替え、テスト間リセット)
- 統合テスト 1 ケース (`record get` happy path) + `--guest-space-id` path 切り替え 1 ケース
- インプロセス方式 (`createProgram()` / `main(argv)`) の動作確認
- `mockAgent.assertNoPendingInterceptors()` で interceptor 実発火の証拠取得

### Phase 4.1: テスト拡充

- shared 層ユニット網羅
- コマンド統合テスト追加:
  - `record get` / `records get --page-all` / `record add`
  - **認証 2 方式 (password + api-token)** + `--auth-type` 明示時の挙動 + 複数検出時の warning
  - **OAuth 指定時の明示エラー検証** (実挙動は OAuth 実装後に分離。Phase 4 スコープ外)
  - `--guest-space-id` パス切り替え
  - `--dry-run` で HTTP 発火しないこと
  - API エラー透過 (stderr / exit code) — **Layer A のみ (§4c 参照)**: HTTP 非 200 レスポンス (body は公式仕様準拠の `{id, code, message}`) で `main()` が 1 を返し stderr にメッセージが出ることを検証。`err.code` の具体値アサーション等は Layer B として分離
  - `noGuestSpace` ガード
  - **`KINTONE_BASE_URL` 未設定時のエラー (v2 追加)**
  - **認証情報未設定時のエラー (v2 追加)**
  - **ネットワークエラー (`fetch` が throw) の透過 (v2 追加)**
  - **429 レート制限時の即失敗 (v2 追加)** — ステータスコード 429 への具体依存は避け、「非 200 → KintoneAPIError → exit 1」の配線確認に留める (v3)
- **NDJSON ストリーミングテスト専用ヘルパ `mockCursorSequence(records)` を設計 (v2 新規)**:
  - POST `/k/v1/records/cursor` (作成) → GET `/k/v1/records/cursor?id=...` を複数回 (最後は `next: false`) → DELETE `/k/v1/records/cursor` (クリーンアップ)
  - 呼び出し順序の assertion と stdout の行単位 assertion を内包
  - 他の統合テストの 3〜5 倍の複雑度があるため専用ヘルパとして切り出す
- 各コマンド 1〜2 ケース

### Phase 4.2: spec 統合

**前提タスク (v2 新規)**:

1. spec 厳密度の 30 分実証タスク (§5)
2. submodule vs コピー運用の決着 (§7a)
3. bundled spec 採用可能性確認 (§7b)
4. 配置ディレクトリ命名決定 (§7c)
5. YAML パーサ (`yaml` or `js-yaml`) 最終選定 (§3)

**本体**:

- spec 取り込み (submodule または vendor コピー、前提タスクで決定)
- ビルドパイプラインに YAML→JSON 変換を追加 (`dist/spec.json`)
- ajv ベースのコントラクト検証ヘルパ (**dev dep**)
- (1) リクエスト・コントラクト検証を既存テストに backport

**v1 から drop**:

- (1.5) fixture vs spec response schema 検証 — 保留 (§5)

### 後続フェーズ (Phase 4.3+ 候補)

- **(3) カバレッジ・メタテスト**: コマンド網羅が安定してから (実装は ~20 行で安価)
- **(4) `--json` バリデーションのテスト**: 機能本体実装後。この時点で `ajv` を dev → runtime に昇格
- **Tier 2 (実 API 手動スモーク)**: file / cursor の限定スコープ
- **OAuth 関連テスト**: OAuth 実装完了後に実挙動 + Tier 2 対象へ追加
- **(1.5) fixture vs spec response schema 検証**: spec drift を実際に検知したい動機が出てきたら

---

## 9. テスト対象外の明記 (v2 新規)

無駄な議論を防ぐため、明示的に「テストしない」を宣言:

- `src/index.ts` の bin エントリ (構造分離後は `main().then(code => process.exit(code))` のみの 1〜2 行)
- `buildAuthHeaders` の OAuth 分岐本体 (機能未実装。throw のみ検証)
- `console.error` での warning 出力の内容そのもの (stderr assertion で代替するかは Phase 4.1 で判断)

## 10. テスト実行時間の目標 (v2 新規、v3 で実測反映)

インプロセス方式を選ぶ理由の 1 つが速度なので、目安を記録:

- ピュアユニット: **< 100ms / case**
- 統合テスト (MockAgent): **< 500ms / case**
- Phase 4.0 完了時点で全テスト (最大 5 ケース): **< 2 秒**
- Phase 4.1 完了時点で全テスト (見込み 30〜50 ケース): **< 10 秒**

### 試作実測 (v3、`feat/phase4-slice` 6 ケース)

| 区分 | per-case | 合計 | 目標との比較 |
|---|---|---|---|
| ピュアユニット (4 ケース) | 0〜2ms | 4ms | **2 桁下回る余裕** |
| 統合テスト (2 ケース) | 2〜8ms | 10ms | **2 桁下回る余裕** |
| 純テスト時間合計 | — | 18ms | — |
| 起動 OH (vitest worker + transformer warmup) | — | ~400ms | — |
| 全体 duration | — | ~400ms | 目標 < 2 秒内 |

**見込み**: Phase 4.1 で 30〜50 ケースに拡大しても、純テスト時間が line 増加に緩やかに比例するだけで、全体は 1〜2 秒前後に収まる。超過した場合は harness の問題 (無駄な再読み込み等) を疑う。

## 11. カバレッジ指標 (v2 新規)

100% は目指さない。**分層ポリシー**:

- `src/client.ts` / `src/commands/shared.ts`: **90%+** (ロジックの核心)
- 各 `src/commands/*.ts` のコマンド登録層: **カバレッジ目標なし** (動作の正しさは統合テスト側で保証)
- `src/auth.ts` の OAuth 分岐: 対象外 (機能未実装)

`vitest --coverage` は標準搭載のため追加依存なし。Phase 4.1 完了時点で初回計測。

---

## 残る決定事項 (v3 更新)

1. ~~**Phase 4.0 前提**: `src/index.ts` 構造分離~~ — **2026-04-16 完了** (`feat/phase4-slice`)
2. **spec 取り込み**: submodule vs コピー、bundled vs 非 bundled、配置ディレクトリ命名 — Phase 4.2 前に決着
3. **spec 厳密度**: 主要 3 エンドポイントでの ajv 検出力 — Phase 4.2 前に 30 分実証
4. **YAML パーサ**: `yaml` vs `js-yaml` — Phase 4.2 着手時に決着
5. **`--schema` 議論との連動**: ideas.md 残課題 (submodule 内パス等) の決着順序
6. **`KintoneAPIError` の構造化判断 (v3 追加)**: JS SDK 相当の構造化 (`id` / `code` / `message` / `errors` / `status` プロパティ) を入れるかどうかは Layer B テスト採否と連動する別設計判断。Phase 4.1 の横展開が一段落した時点で再訪

---

## 議論の経過で否定された案 (記録)

意思決定に至る過程で一度は提案したが、検討の結果取り下げた案:

- **モックだけで十分**: 再考の結果、実 API テストは限定的補強として残す形に整理
- **「最小スコープ」に spec ローダ + ajv をバンドル**: spec 設計の未決事項に依存するため初手投入は重い → Phase 4.2 に分離
- **`@apidevtools/swagger-parser` + `@stoplight/prism` 採用**: オーバースペック → 削除
- **`node:test` への全面移行**: vitest 採用希望と乖離 → 中点 (vitest + undici) に着地
- **(1.5) fixture vs spec response schema 検証** (v2 で drop): 自コードのバグ検知寄与が薄く、spec drift ノイズで CI を不安定化させるリスク優位
- **`ajv` を runtime 依存として前倒し投入** (v2 で保留): `--json` バリデーション未実装の間は npm 配布物に無駄な依存を載せることになる
- **夜間 CI による Tier 2 スモーク** (v2 で絞り込み): Secrets 運用方針 (direnv + Keychain) と衝突。手動スモークで十分
- **Phase 4.0 で harness と統合テストを同時導入** (v2 で分割): harness の問題とテストコードの問題を切り分けにくい

---

## 参考

- `reports/phase4-test-strategy-review.md` — v1 レビュー (v2 改訂の根拠)
- `docs/phase4-slice-plan.md` — 最小スライス試作 計画 (v2)
- `docs/phase4-slice-findings.md` — 試作結果 (v3 改訂の根拠)
- `docs/spec.md` — kintone-cli 設計原則
- `docs/decisions.md` — 既存設計判断 (2026-03-24 direnv + Keychain)
- `docs/ideas.md` — 検討事項 (`--schema` 議論、テスト項目)
- ~~`src/index.ts:51` — 現状の module-load 時 `parseAsync()`~~ → 構造分離済 (`src/cli.ts:main`)
- `src/cli.ts` — `createProgram()` + `main(argv)` (v3 更新)
- `src/client.ts:66` — global fetch 使用箇所 (テスト対象)
- `src/client.ts:69-73` — `KintoneAPIError` (現状は raw body を message に。構造化は §残る決定事項 6)
- `src/commands/shared.ts` — 共通ヘルパ (ピュアユニット対象)
- `src/auth.ts:95` — OAuth 未実装の throw
- https://github.com/kintone/rest-api-spec — OpenAPI Spec 一次ソース (正常系のみ)
- https://cybozu.dev/ja/kintone/docs/rest-api/overview/kintone-rest-api-overview/ — エラーレスポンス一次ソース (`{id, code, message}` 3 フィールド定義)
- https://github.com/kintone/js-sdk/tree/main/packages/rest-api-client/src/error — `KintoneRestAPIError` (エラー shape の事実上の二次リファレンス)
