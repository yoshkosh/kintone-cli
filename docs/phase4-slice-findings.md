# Phase 4 最小スライス試作 観察メモ

日付: 2026-04-16
ブランチ: `feat/phase4-slice`
計画: `docs/phase4-slice-plan.md` (v2)
戦略: `docs/phase4-test-strategy.md` (v2)

---

## 結論

**継続判断: Phase 4.1 着手 + 戦略 v2 を `docs/decisions.md` へ転記**。ただし戦略 v2 §3 の MockAgent 採用表記を「**MockAgent + `vi.stubGlobal('fetch', undici.fetch)` の併用**」に微修正する必要がある (詳細 H3)。

H1〜H5 の判定:

| # | 仮説 | 結果 | 補足 |
|---|---|---|---|
| H1 | `src/index.ts` 構造分離が回帰なし | ✓ OK | smoke 5/5 通過 |
| H2 | `exitOverride()` で戻り値取得 | ✓ OK | help/version=0、必須欠如=1 を両立 |
| H3 | undici `MockAgent` で global fetch を intercept | ▲ **条件付き OK** | 単体では NG、`vi.stubGlobal('fetch', undiciFetch)` 経由で成立 |
| H4 | `vi.stubEnv()` のテスト間清潔さ | ✓ OK | 2 ケース異 token / 異 path で相互干渉なし |
| H5 | 実行時間目標 (< 100ms ピュア / < 500ms 統合) | ✓ OK | ピュア avg 1ms、統合 avg 5ms |

撤退基準には抵触せず。

---

## 仮説別詳細

### H1: 構造分離 (✓ OK)

`src/cli.ts` に `createProgram()` + `main(argv)` を分離し、`src/index.ts` を bin エントリ (8 行) に圧縮。

smoke 5/5 通過:

| # | コマンド | 期待 | 実測 |
|---|---|---|---|
| 1 | `--help` | 出力 + exit 0 | ✓ |
| 2 | `--version` | `0.5.0` + exit 0 | ✓ |
| 3 | `record add --json '{"app":1,"record":{}}' --dry-run` | dryRun JSON + exit 0 | ✓ |
| 4 | `record get` (引数欠如) | required option エラー + exit 1 | ✓ |
| 5 | `nr build` 通過 | ✓ | ✓ |

**計画からの逸脱**: 計画は smoke 3 を `record add --app 1 --json '{}' --dry-run` と記載していたが、`record add` は `--app` を受け付けない。`--json` の中に `app` を含める形 (`--json '{"app":1,"record":{}}'`) に差し替えて意図を満たした。

`CommanderError.exitCode` 尊重ロジックは想定通り動作。help/version (exitCode 0) と必須欠如 (exitCode 1) が両立。

### H2: exitOverride の戻り値 (✓ OK)

`main()` は number を返す: 通常完了 0、`KintoneAPIError` 1、`CommanderError` は `err.exitCode` を尊重。統合テスト 2 ケースで `code === 0` を確認、smoke 4 で必須欠如時の `code === 1` (commander 経由) を確認。

### H3: MockAgent fetch interception (▲ 条件付き OK)

**詰まり**: `setGlobalDispatcher(mockAgent)` 単体では Node 22 のビルトイン `fetch` を intercept できなかった。最初のテスト実行で MockAgent を設定済みにもかかわらず、リクエストが `https://example.cybozu.com` の実 DNS に解決され、Cybozu 本番の 404 HTML (日本語: 「このリンクは不正です」) が返ってきた。

**原因**: Node 22 のビルトイン `globalThis.fetch` は **Node 同梱の undici** を使用する。`devDependencies` でインストールした userland undici 8.1.0 とは別インスタンスのため、userland 側の `setGlobalDispatcher` がビルトイン fetch には伝播しない (issue 既知)。

**保険経路の発動 (計画の論点 4)**: `beforeEach` で `vi.stubGlobal("fetch", undiciFetch)` を行い、テスト実行中は Node ビルトイン fetch を userland undici の `fetch` に差し替えた。これにより MockAgent が intercept でき、両ケース green になった。

**配線の整理**:

```ts
import { fetch as undiciFetch, MockAgent, setGlobalDispatcher } from "undici";

beforeEach(() => {
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
  vi.stubGlobal("fetch", undiciFetch); // ← この 1 行が H3 を成立させる鍵
  // ...
});
```

**真の成立条件 (assertNoPendingInterceptors)**: 計画では `mockPool.assertNoPendingInterceptors()` だったが、undici 8.1.0 では当該メソッドは `MockAgent` 上にのみ存在するため `mockAgent.assertNoPendingInterceptors()` を使用。両ケースで通過し、interceptor が確実に発火した証拠を取得。

**戦略 v2 §3 への影響**: 「`undici MockAgent`」採用表記を以下に修正する必要あり。

> undici `MockAgent` を採用。Node 22 のビルトイン fetch は同梱 undici を使うため、各テストで `vi.stubGlobal('fetch', undici.fetch)` により userland undici に差し替えてから intercept する。

この差し替えはコストとして小さく (1 行 + import 1 つ)、戦略の方針 (fetch インターセプト) は維持できる。`vi.stubGlobal` 単独 (= MockAgent 不採用) への撤退ではないため、**条件付き OK** と判定。

### H4: テスト間独立性 (✓ OK)

ケース A は token `test-token-a` + path `/k/v1/record.json`、ケース B は token `test-token-b` + path `/k/guest/5/v1/record.json` を期待 intercept。両ケースが各自の interceptor で応答し、`assertNoPendingInterceptors()` が通過したことから:

- env (`KINTONE_API_TOKEN`) はテスト間でリセット (`vi.unstubAllEnvs()`) されている
- dispatcher は各 `beforeEach` で新規 `MockAgent` 生成、`afterEach` で `close()` により独立
- 全 7 種の `KINTONE_*` 環境変数を `beforeEach` で `vi.stubEnv(key, "")` で初期化することで、ホスト環境の env 設定 (= 開発者の本番資格情報) によるテスト挙動の揺れを防止

ピュアユニット 2 ファイル + 統合 1 ファイルの混在実行でも汚染なし。

### H5: 実行時間 (✓ OK)

最終測定 (`nlx vitest run --reporter=verbose`):

| 区分 | per-case | 合計 | 目標 |
|---|---|---|---|
| ピュアユニット (4) | 0〜2ms | 4ms | < 100ms / case |
| 統合 (2) | 2〜8ms | 10ms | < 500ms / case |
| 純テスト時間合計 | — | 18ms | — |
| 起動 OH (transform + import) | — | 320〜400ms | (worker + transformer warmup) |
| 全体 duration | — | ~400ms | — |

純テスト時間は目標を 2 桁下回る余裕。起動 OH の 320〜400ms は vitest worker + esbuild の典型値で、ファイル数増加に対しては緩やかに増える程度。Phase 4.1 で 10 ファイル規模になっても 1 秒前後で収まると見込み。

---

## 戦略 v2 への影響 (decisions.md 転記前の修正)

### 必須修正 1 件

**§3 (実装スタック)** の「fetch モック: undici `MockAgent`」を以下に書き換え:

> fetch モック: undici `MockAgent` + `vi.stubGlobal('fetch', undici.fetch)` の併用。Node 22 のビルトイン fetch は Node 同梱 undici を使うため、userland undici (devDependency) の `setGlobalDispatcher` だけでは intercept できない。各テストの `beforeEach` で global fetch を `undici.fetch` (userland) に差し替えてから MockAgent を有効化する。

### 推奨修正 1 件 (任意)

**§4 (テストヘルパ)** に MockAgent + stubGlobal のテンプレ (本ドキュメント H3 のコード断片) を追加し、Phase 4.1 で全統合テストが同じ配線を踏めるようにする。

### 修正不要

§4 の `vi.stubEnv` / commander `exitOverride()`、§10 の実行時間目標、その他は v2 のままで良い。

---

## 残課題と Phase 4.1 への申し送り

1. **stdout/stderr 捕捉ヘルパ化**: `vi.spyOn(process.stdout, "write")` のボイラープレートが各統合テストで重複する。`captureStreams()` 等のヘルパに切り出すと記述量を削減可能 (Phase 4.1 で書きながら判断)
2. **fixtures の整理**: 今回は inline の `FIXTURE` 定数だが、複数テストで共有するレスポンスは `src/__fixtures__/` に切り出す
3. **NDJSON ストリーミング系のテスト**: `records get --page-all` のカーソル API はモック interceptor を 3 段 (cursor 作成 → ページング GET → cursor 削除) に並べる必要がある。Phase 4.1 で着手
4. **エラーパス**: 401/403/404 系のレスポンスを MockAgent で返した時の `KintoneAPIError` 経路と `main()` 戻り値 1 を 1 ケースで確認したい (今回スコープ外)
5. **assertNoPendingInterceptors の粒度**: 現状 `mockAgent.assertNoPendingInterceptors()` (全 pool 横断)。pool 別に検証したいケースが出たら `mockAgent.pendingInterceptors()` を使用

---

## 工数実績

| Task | 見積 | 実績 | 差分理由 |
|---|---|---|---|
| 1. 構造分離 | 15 分 | ~10 分 | スムーズ |
| 2. vitest セットアップ | 20 分 | ~10 分 | 設定が最小で済んだ |
| 3. ピュアユニット | 20 分 | ~5 分 | 自明 |
| 4. 統合テスト | 75 分 | ~40 分 | H3 詰まりに約 20 分、保険経路で復旧 |
| 5. 観察メモ | 15 分 | ~15 分 | — |
| **合計** | **~2 時間 15 分** | **~80 分** | 上限 4 時間に対し十分内 |

---

## 生成物

- `src/cli.ts` (新規、67 行)
- `src/index.ts` (書き換え、9 行)
- `src/client.test.ts` (新規、14 行)
- `src/commands/shared.test.ts` (新規、15 行)
- `src/cli.test.ts` (新規、116 行)
- `vitest.config.ts` (新規、9 行)
- `package.json` (test scripts + dev deps)
- `tsconfig.json` (exclude `src/**/*.test.ts`)
- `pnpm-lock.yaml` (依存ロック更新)

---

## 参考

- `docs/phase4-test-strategy.md` (v2)
- `docs/phase4-slice-plan.md` (v2)
- `reports/phase4-slice-plan-review.md`
- 関連 issue: nodejs/undici 周辺で global fetch と `setGlobalDispatcher` の組み合わせ挙動 (Node 同梱 undici と userland undici が別インスタンス)
