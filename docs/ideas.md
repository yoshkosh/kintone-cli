# 残作業・アイディア

未着手の作業項目とアイディアを集約する場所。決定したら [decisions.md](decisions.md) へ、実装したら [spec.md](spec.md) を更新する。

---

## CLI 機能

### `--schema` 拡張（第二弾以降）

第一弾実装（2026-05-02、各エンドポイントコマンドに `--schema` を追加）は decisions.md 記録済み。残課題:

- 引数なし `kt --schema`: 全エンドポイント一覧 / インデックス出力。スコープと出力形式が未確定。
- `$ref` の dereference: 現状は spec のまま切り出すため `#/components/schemas/...` が残る。LLM 側で扱いづらい場面が出れば対応。
- `components.schemas` の併出: ref 解決と同様、参照先の schema を含めて返す案。

### 出力フォーマットオプション（将来候補）

`--format table` 等の人間向け出力フォーマット。2026-03-12 の初期リリース判断で見送り。JSON 出力のみで AI エージェント用途には十分だが、人間が直接使う場面では不便。

---

## テスト・品質

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
