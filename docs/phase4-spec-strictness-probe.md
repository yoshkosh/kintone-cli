# kintone OpenAPI Spec 厳密度実証 (ajv 検出力プローブ)

日付: 2026-04-21
実施者: Phase 4.2 前提タスクとして (`docs/phase4-test-strategy.md` v3 §5 の「spec 厳密度の事前検証」)
プローブ: `experiment/spec-probe.mjs`
spec バージョン: `kintone/rest-api-spec` `20250423000000` (bundled)

## 目的

Phase 4.2 (OpenAPI Spec ベースのリクエスト・コントラクト検証) に本格投資する前に、kintone の spec が ajv 検証で**意味のある厳密度を持っているか**を実物で確認する。spec が緩すぎれば投資判断自体を見直す前提だった。

## 実施内容

主要 3 エンドポイントの spec schema を ajv に食わせ、**意図的に壊した 9 パターンのリクエスト**を検証:

| エンドポイント | 壊し軸 | 送ったデータ |
|---|---|---|
| GET /k/v1/record.json | 余計なフィールド | `{app:1, id:1, foo:"extra"}` |
| GET /k/v1/record.json | 必須欠如 | `{id:1}` |
| GET /k/v1/record.json | 型違反 | `{app:"abc", id:1}` |
| GET /k/v1/records.json | 余計なフィールド | `{app:1, bogus:"x"}` |
| GET /k/v1/records.json | 必須欠如 | `{fields:["a"]}` |
| GET /k/v1/records.json | 型違反 | `{app:1, totalCount:"yes"}` |
| POST /k/v1/record.json | 余計なフィールド | `{app:1, record:{}, wrong:"x"}` |
| POST /k/v1/record.json | 必須欠如 | `{app:1}` |
| POST /k/v1/record.json | 型違反 | `{app:"abc", record:{}}` |

ajv 設定: `{ strict: false, allErrors: true, coerceTypes: true }`。spec の `format: "long"` / `"query"` / `"boolean"` / `"date-time"` / `"number"` は unknown format として無視 (type による検査は維持)。

## 結果

**検出率: 6/9 (67%)**

| 軸 | 検出数 | 判定 |
|---|---|---|
| 必須欠如 | 3/3 | ✓ |
| 型違反 | 3/3 | ✓ |
| 余計なフィールド | 0/3 | ✗ |

### ✓ 機能している箇所

- **`required` 指定**: 3 エンドポイント全てで正しく宣言されており、欠如を確実に検出 (`must have required property 'app'` / `'record'`)
- **`type` による型検査**: `integer` / `boolean` いずれも型違反を検出 (`must be integer` / `must be boolean`)。`coerceTypes: true` を有効にしても強制変換できない値 (`"abc"` → integer、`"yes"` → boolean) は弾ける

### ✗ 素通りする箇所 (余計なフィールド 0/3)

ログで spec schema に `additionalProperties: false` が**一切指定されていない**ことを目視確認済。これは kintone spec 固有の欠陥ではなく **OpenAPI 3.x のデフォルト挙動** (opt-in で明示しない限り追加プロパティを許可)。

## 考察

### spec 自体は投資に耐える厳密度

「spec が緩すぎて ajv 投資を見直すべき」状態ではない。`additionalProperties: true` の**多用**や、`oneOf` / `anyOf` の過度な緩さ、`required` 欠如といった**スペック側の構造的問題**は見当たらなかった。

### 余計なフィールド問題は解決可能

OpenAPI のデフォルトで `additionalProperties: false` が無いため余計なフィールドが通るが、**検証層で post-process として注入**すれば 9/9 の検出率になる。具体的には:

```ts
// 簡略化した例: schema 再帰的に additionalProperties: false を追加
const tighten = (schema: object): object => {
  if (schema.type === "object" && schema.additionalProperties === undefined) {
    schema.additionalProperties = false;
  }
  if (schema.properties) {
    for (const key in schema.properties) {
      schema.properties[key] = tighten(schema.properties[key]);
    }
  }
  return schema;
};
```

注意点: `record` プロパティのように `additionalProperties.anyOf` で**意図的に任意フィールド**を受け付ける設計箇所は除外する必要あり (kintone フィールドコードはユーザ定義のため)。ホワイトリスト方式で「top-level requestBody の直下のみ tighten」する程度の粒度が実用的。

### 未検証の論点 (Phase 4.2 本体で判断)

- **`oneOf` / `anyOf` の現実的な厳密度**: 今回の 3 エンドポイントでは使用箇所が record の内部 schema に限られ、probe では empty `{}` がどの branch にも当たり得る状態。実際に複雑な requestBody (bulkRequest 等) で検出力が落ちないかは要確認
- **エラーレスポンス**: 本プローブは正常系リクエストのみ対象。エラー body の構造化アサーションは Layer B として引き続き保留 (ADR 「API エラーテスト」)

## 結論

**Phase 4.2 着手 GO**。

根拠:
- spec の `required` / `type` は信頼できる (6/9 が自然に検出)
- 未検出の余計なフィールドは schema post-process で 9/9 に到達可能 (追加コスト小)
- Phase 4.2 の投資 (ajv dev 依存、ビルドパイプライン、検証ヘルパ) は既存テスト 22 件の強化として十分な ROI

## 次のアクション

1. Phase 4.2 本体の前提タスク残り 2 件を片付ける:
   - spec 取り込み方式決定 (submodule vs コピー、bundled vs 非 bundled、配置ディレクトリ命名)
     - **仮決定**: `third_party/rest-api-spec/bundled/openapi.yaml` のコピー運用 (今回の probe で実効性確認済)
   - YAML パーサ選定 (`yaml` vs `js-yaml`)
     - **仮決定**: `yaml` を採用 (今回の probe で使用、ESM ネイティブ、型同梱)
2. ビルドパイプラインに spec YAML→JSON 変換を追加 (`dist/spec.json`) — npm 配布物に同梱するため
3. 検証ヘルパ実装:
   - spec ローダ
   - schema post-process (`additionalProperties: false` 注入)
   - 検証関数 (path + method → validator)
4. 既存の `src/cli.test.ts` 統合テストに backport (intercept で捕捉したリクエストを spec で検証)

## 参考

- `experiment/spec-probe.mjs` — 再実行可能なプローブスクリプト
- `third_party/rest-api-spec/openapi.yaml` — 使用した bundled spec (1.6 MB、49,688 行)
- `docs/phase4-test-strategy.md` v3 §5 — 本プローブの前提
- `docs/decisions.md` 2026-04-16 OpenAPI Spec 活用 ADR
