# Phase 4 最小スライス試作 計画

日付: 2026-04-16 (v1)
改訂: 2026-04-16 (v2 — レビュー `reports/phase4-slice-plan-review.md` を反映)
文脈: `docs/phase4-test-strategy.md` v2 を `docs/decisions.md` へ確定する前に、実コードで少数のテストを書いて戦略の妥当性を検証する。
関連:

- `docs/phase4-test-strategy.md` v2 §8 "Phase 4.0 前提" / "Phase 4.0a" / "Phase 4.0b"
- `reports/phase4-test-strategy-review.md` (戦略 v1 レビュー)
- `reports/phase4-slice-plan-review.md` (本計画 v1 のレビュー、GPT レビュー統合済)

---

## v1 → v2 の変更 (レビュー反映)

本計画のレビューの **必須 4 + 強く推奨 3 項目**を反映:

- **必須 (論点 1)**: Task 1 の `main()` 実装例に `CommanderError` 分岐を追加。受入条件に `--help` / `--version` の終了コード 0 を明示
- **必須 (論点 2)**: Task 4 を統合テスト 2 ケースに拡張 (ケース A: 通常、ケース B: `--guest-space-id` 付きで path 切り替えも検証)
- **必須 (論点 3)**: Task 4 受入条件に `mockPool.assertNoPendingInterceptors()` を追加し、MockAgent 発火の偽陽性を排除
- **必須 (論点 16)**: Task 1 smoke を `record get --dry-run` (現行実装に存在しない) から `record add --dry-run` に差し替え
- **強く推奨 (論点 4)**: 撤退基準を 2 段化 (MockAgent → `vi.stubGlobal('fetch', ...)` 保険 → v3 改訂)
- **強く推奨 (論点 5)**: 実行時間測定を `--reporter=verbose` で per-case 取得、起動オーバーヘッドと純テスト時間を分離
- **強く推奨 (論点 17)**: `vitest.config.ts` に `passWithNoTests: true` を追加 (vitest のデフォルトは 0 件で exit 1)

残り (論点 6〜15, 18 の推奨項目) は v2 では未反映。着手後に気付いても致命傷にならない判断。

---

## 目的

戦略 v2 は「書いてみないと分からない」前提を複数含む。decisions.md へ確定する前にそれらを実コードで検証し、以下のいずれかに着地する:

- **v2 維持 + Phase 4.1 着手**: 仮説がすべて成立
- **v3 改訂**: 成立しない仮説を織り込んで戦略を修正

---

## 検証する仮説

| # | 仮説 | 検証方法 | 関連 |
|---|---|---|---|
| H1 | `src/index.ts` を `createProgram()` + `main(argv)` に構造分離でき、既存 CLI 挙動に回帰が出ない | Task 1 + 手動 smoke | v2 §4 / §8 |
| H2 | commander の `exitOverride()` でテスト側が終了コードを戻り値として受け取れる | Task 4 | v2 §4 |
| H3 | vitest + undici `MockAgent` が `src/client.ts:66` の global `fetch` をインプロセスでインターセプトできる | Task 4 | v2 §3 / §4 |
| H4 | `vi.stubEnv()` で `process.env` をテスト間で清潔にリセットできる | Task 4 (複数テストの独立性) | v2 §4 |
| H5 | §10 の実行時間目標 (ピュアユニット < 100ms / 統合 < 500ms / case) が現実的 | Task 3 + Task 4 の実測 | v2 §10 |

---

## スコープ外 (今回試作しないこと)

- spec 厳密度の 30 分実証タスク (Phase 4.2 前提、独立に実施)
- submodule vs コピー運用の決定
- `ajv` / YAML パーサ導入
- NDJSON ストリーミングヘルパ (Phase 4.1)
- カバレッジ計測 (Phase 4.1 完了時点)
- OAuth 関連テスト
- `--dry-run` テスト (MockAgent 配線の検証を優先するため、今回は fetch を実際に通す)

---

## 前提条件

- 試作専用のフィーチャーブランチを切る (例: `feat/phase4-slice`)。失敗時にマージしない選択肢を残す
- 実装方針がハズレたら Task 5 の観察メモを最優先とし、ブランチは破棄可

---

## タスク

### Task 1: `src/index.ts` 構造分離 (想定 15 分)

**ゴール**: モジュール評価時に `parseAsync()` が走らない状態。インプロセステスト可能に。

**変更**:

- `src/cli.ts` 新規作成:
  ```ts
  import { Command, CommanderError } from "commander";
  // 各 registerXxxCommands のインポート (既存 src/index.ts と同等)

  export const createProgram = (): Command => {
    const program = new Command();
    // 既存 src/index.ts の program 構築 (name/description/version/option/
    // 各 registerXxxCommands()) をこの関数内に移設
    return program;
  };

  export const main = async (
    argv: readonly string[] = process.argv,
  ): Promise<number> => {
    const program = createProgram();
    program.exitOverride();
    try {
      await program.parseAsync(argv);
      return 0;
    } catch (err) {
      // commander は --help / --version / missingArgument 等も
      // CommanderError として throw する。err.exitCode を尊重することで
      // help/version (exitCode=0) を 1 に回帰させない (論点 1)。
      if (err instanceof CommanderError) {
        return err.exitCode;
      }
      if (err instanceof Error && err.name === "KintoneAPIError") {
        process.stderr.write(err.message + "\n");
        return 1;
      }
      process.stderr.write(`Error: ${(err as Error).message}\n`);
      return 1;
    }
  };
  ```
- `src/index.ts` を bin エントリに圧縮:
  ```ts
  #!/usr/bin/env node
  import { main } from "./cli.js";

  process.stdout.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(0);
    throw err;
  });

  main().then((code) => process.exit(code));
  ```
- EPIPE ハンドラは bin 固有の関心事なので `src/index.ts` に残す

**受入条件**:

- `nr build` が通る
- `node dist/index.js --help` が従来と同等の出力 **かつ exit code 0** (論点 1)
- `node dist/index.js --version` が従来と同等の出力 **かつ exit code 0** (論点 1)
- `node dist/index.js record add --app 1 --json '{}' --dry-run` で dry-run JSON が stdout に出る (論点 16: `record get` には `--dry-run` が無いため write 系に差し替え)
- `node dist/index.js record get` (必須オプション欠如) で exit code 1 と従来通りのエラー出力

**H1 成立条件**: 上記 5 つの smoke がすべて通る。`CommanderError.exitCode` を尊重することで help/version の 0 終了と必須欠如の 1 終了が両立し、既存の KintoneAPIError 処理とも共存する。

---

### Task 2: vitest セットアップ (想定 20 分)

**変更**:

- `ni -D vitest undici`
- `package.json`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- `vitest.config.ts` 最小構成:
  - `test.environment: "node"`
  - **`test.passWithNoTests: true`** (論点 17: vitest のデフォルトは 0 件で exit 1。Task 2 単独完了判定と将来の filter 指定時の一貫性のため必須)
- `tsconfig.json` の調整:
  - 現在 `"include": ["src/**/*"]` は `*.test.ts` も拾う → `tsc --build` で `dist/` にテストファイルが出力されてしまう
  - **対応**: `"exclude"` に `"src/**/*.test.ts"` を追加
  - 代替案 (要検討): `tsconfig.build.json` 分離。今回はシンプルに exclude 追記で進める

**決定事項**:

- テストファイル配置: **コロケーション (`src/**/*.test.ts`)**
  - 理由: import path が短い / vitest 慣例 / プロダクションコードと視認性が揃う
  - ビルド出力には `tsconfig.json` の exclude で除外

**受入条件**:

- `nr test` が「テスト 0 件」で 0 終了
- `nr build` で `dist/` にテストファイルが出力されない
- `nr build` 後も `node dist/index.js --help` が動く

---

### Task 3: ピュアユニット 2 ファイル 4 ケース (想定 20 分)

**対象**:

- `src/client.test.ts` (対: `src/client.ts:20` `buildPath`)
  - ケース a: `buildPath("/k/v1/record.json")` → `"/k/v1/record.json"` (guestSpaceId 未指定)
  - ケース b: `buildPath("/k/v1/record.json", 5)` → `"/k/guest/5/v1/record.json"`
- `src/commands/shared.test.ts` (対: `src/commands/shared.ts:16` `toGuestSpaceId`)
  - ケース a: `toGuestSpaceId({})` → `undefined`
  - ケース b: `toGuestSpaceId({ guestSpaceId: "5" })` → `5` (number 型)

**受入条件**:

- `nr test` で 4 ケース green
- `nr test -- --reporter=verbose` で per-case 実行時間を記録 (**H5 測定**、論点 5)
- 起動オーバーヘッド (worker 生成 + transformer warmup、500〜1500ms 想定) と純テスト時間を**分離**して記録する
- 純テスト時間で 1 ケース平均 < 100ms を確認

---

### Task 4: 統合テスト 2 ケース (`record get`) (想定 75 分 — 最大の未知数)

**対象**: 以下 2 ケース。H4 (テスト間独立性) を裏付けるには fetch を通すテストが 2 ケース以上必要 (論点 2)。ケース B は `--guest-space-id` による path 切り替え検証も兼ねるため ROI が高い。

| ケース | コマンド | 期待 path | token |
|---|---|---|---|
| A | `record get --app 1 --id 1` | `/k/v1/record.json` (query: `app=1&id=1`) | `test-token-a` |
| B | `record get --app 2 --id 2 --guest-space-id 5` | `/k/guest/5/v1/record.json` (query: `app=2&id=2`) | `test-token-b` |

**配置**: `src/cli.test.ts`

**検証内容 (各ケース共通)**:

- undici `MockAgent` を `setGlobalDispatcher()` で注入
- `intercept()` の query は **オブジェクト形式** `{ app: "1", id: "1" }` で指定 (path 文字列マッチは `appendQueryParams` のキー順に依存するため避ける)
- `X-Cybozu-API-Token` ヘッダが expected token と一致
- MockAgent が fixture `{ record: { name: { value: "test" } } }` を返す (ASCII キーで JSON escape 混乱を回避)
- `main([...])` を呼び、戻り値 0
- stdout に fixture の整形 JSON (2 スペースインデント + 末尾改行) が書かれる

**環境変数** (各テストの `beforeEach` で `vi.stubEnv()` により注入):

- `KINTONE_BASE_URL=https://example.cybozu.com`
- `KINTONE_API_TOKEN=<ケースごとに分離、ケース A: test-token-a, ケース B: test-token-b>`

**決定事項** (試作で選び、Task 5 で採用根拠とともに記録):

- MockAgent ライフサイクル: `beforeEach` で新規生成、`afterEach` で `close()` (テスト独立性優先)
- stdout 捕捉: `vi.spyOn(process.stdout, "write")` で開始
- dispatcher リセット: 各テストで新 MockAgent を生成

**受入条件**:

- 両ケースが green
- 各ケースで **`mockPool.assertNoPendingInterceptors()` が通る** (論点 3 = **H3 真の成立条件**: 全 interceptor が実発火した証拠、偽陽性の排除)
- ケース B で path が `/k/guest/5/v1/record.json` に切り替わっていることを intercept 引数で assertion
- ケース A の MockAgent 設定がケース B に漏れない (両ケースが自身の interceptor で応答)
- `main()` の戻り値 0 が取れる (**H2 成立条件**)
- `nr test -- --reporter=verbose` で per-case 実行時間を記録 (純テスト時間で 2 ケース合計 < 1 秒、起動 OH は別計上)
- ピュアユニットと統合を混ぜて `nr test` した結果、**ケース間・ファイル間で env や dispatcher が漏れていない** (= **H4 成立条件**)

---

### Task 5: 実測と観察メモ (想定 15 分)

**生成物**: `docs/phase4-slice-findings.md`

**記録項目**:

- 仮説 H1〜H5 ごとの検証結果 (OK / NG / 条件付き OK)
- 実測実行時間: ピュアユニット各ケース / 統合テスト / 全体
- §10 目標との比較
- 詰まった点 (commander / undici / vitest の癖)
- 戦略 v2 への影響:
  - 修正不要なら: v2 を decisions.md へ転記できる
  - 修正必要なら: v3 改訂の論点リスト

---

## 撤退・判断基準

### 継続判断 (→ Phase 4.1 着手 + v2 を decisions.md へ)

Task 1〜4 の受入条件がすべて満たされ、H1〜H5 がすべて OK。

### 中間保険 (v3 改訂の前に試す、論点 4)

undici `MockAgent` が詰まった場合、**即 v3 改訂ではなく**以下の保険経路を先に試す:

- `vi.stubGlobal('fetch', mockFetchFn)` で global fetch を直接差し替える自前モック
- これは戦略 v2 §3 で一度 drop した案だが、「戦略の方針 (fetch インターセプト) は維持、実装だけ別経路」の保険として機能する

保険で Task 4 が green になるなら H3 は「MockAgent は不採用だが統合テストは書ける」として条件付き成立。戦略 v2 §3 の `undici MockAgent` 採用表記を「MockAgent 推奨、不成立時は `vi.stubGlobal` にフォールバック」と微修正する。

### v3 改訂へ (撤退)

保険経路でも以下のいずれかが発生した場合:

- Task 1 で `exitOverride()` + `CommanderError` 分岐が既存エラー挙動と共存できない
- MockAgent も `vi.stubGlobal('fetch')` も global fetch に噛まない (Node.js バージョンや ESM 周りの根本問題の疑い)
- テスト間の dispatcher / env 汚染を清潔にリセットできない
- 累積作業時間が **4 時間を超え**、かつ解決の見通しが立たない

撤退時はブランチをそのまま残し、`docs/phase4-slice-findings.md` に「なぜ撤退したか / v3 で何を変えるか」を記録。

---

## 生成物一覧

- `src/cli.ts` (新規)
- `src/index.ts` (書き換え、10 行程度)
- `src/client.test.ts` (新規)
- `src/commands/shared.test.ts` (新規)
- `src/cli.test.ts` (新規)
- `vitest.config.ts` (新規)
- `package.json` (test script + dev deps)
- `tsconfig.json` (exclude 追記)
- `docs/phase4-slice-findings.md` (事後メモ)

---

## 依存追加 (試作スコープ)

- `vitest` (dev)
- `undici` (dev)

※ `ajv` / `yaml` は Phase 4.2 なので本試作では不要

---

## 工数見積

| Task | 見積 |
|---|---|
| 1. 構造分離 | 15 分 |
| 2. vitest セットアップ | 20 分 |
| 3. ピュアユニット | 20 分 |
| 4. 統合テスト (MockAgent, 2 ケース) | 75 分 |
| 5. 観察メモ | 15 分 |
| **合計** | **~2 時間 15 分 (上限 4 時間)** |

---

## 参考

- `docs/phase4-test-strategy.md` (v2)
- `reports/phase4-test-strategy-review.md` (v1 レビュー)
- `src/index.ts:51` — 構造分離対象の `program.parseAsync()`
- `src/client.ts:20` — `buildPath`
- `src/client.ts:66` — global `fetch` 使用箇所
- `src/commands/shared.ts:16` — `toGuestSpaceId`
- `src/auth.ts:57,95` — `resolveAuth` / OAuth 未実装 throw
