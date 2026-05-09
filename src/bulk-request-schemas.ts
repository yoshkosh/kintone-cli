// NOTE: bulkRequest sub-payload の検証で参照する (method, api) → sub-schema 名の対応表。
// spec の `BulkRequestPostRequestForm.payload.anyOf` に列挙された 8 種を明示的に
// リテラル定数として持つ。spec の命名規則からの自動推測 (例: 名前から (method, api)
// を逆引き) は spec 命名が崩れた瞬間に黙って壊れるため採らない。
// マップ整合性は src/spec.test.ts の S1 で「anyOf の $ref 名集合 == BULK_SUB_API_MAP の
// 値集合」を検査して担保する。

export const BULK_SUB_API_MAP: ReadonlyMap<string, string> = new Map([
  ["POST /k/v1/record.json", "BulkRequestPostRecordPostForm"],
  ["PUT /k/v1/record.json", "BulkRequestPostRecordPutForm"],
  ["PUT /k/v1/record/status.json", "BulkRequestPostRecordStatusPutForm"],
  ["PUT /k/v1/record/assignees.json", "BulkRequestPostRecordAssigneesPutForm"],
  ["DELETE /k/v1/records.json", "BulkRequestPostRecordsDeleteForm"],
  ["POST /k/v1/records.json", "BulkRequestPostRecordsPostForm"],
  ["PUT /k/v1/records.json", "BulkRequestPostRecordsPutForm"],
  ["PUT /k/v1/records/status.json", "BulkRequestPostRecordsStatusPutForm"],
]);

// NOTE: 完全一致 lookup のみ行い、case 正規化はしない。
// kintone は事実上 POST/PUT/DELETE 大文字運用で、CLI 側の事前検証で
// lower-case method を弾くのが「正確性優先」と整合する。
// lower-case などミスマッチは呼び出し側で `bulkRequestUnknownSubapi` として弾く。
export const resolveBulkSubSchema = (method: string, api: string): string | undefined =>
  BULK_SUB_API_MAP.get(`${method} ${api}`);
