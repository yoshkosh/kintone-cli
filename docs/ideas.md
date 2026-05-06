# これからやること・アイディア

リリース後の next backlog として、未着手の作業項目とアイディアを集約する場所。決定したら [decisions.md](decisions.md) へ、実装したら [spec.md](spec.md) を更新する。

---

## CLI 機能

### `--schema` 拡張（第二弾以降）

第一弾実装（2026-05-02、各エンドポイントコマンドに `--schema` を追加）は decisions.md 記録済み。残課題:

- 引数なし `kt --schema`: 全エンドポイント一覧 / インデックス出力。スコープと出力形式が未確定。
- `$ref` の dereference: 現状は spec のまま切り出すため `#/components/schemas/...` が残る。LLM 側で扱いづらい場面が出れば対応。
- `components.schemas` の併出: ref 解決と同様、参照先の schema を含めて返す案。

### 出力フォーマットオプション（将来候補）

`--format table` 等の人間向け出力フォーマット。2026-03-12 の初期リリース判断で見送り。JSON 出力のみで AI エージェント用途には十分だが、人間が直接使う場面では不便。

### API エラー時の exit code 一貫性

Phase 9 検証中に観察: `kt record get` が kintone API エラー（権限不足など）を返すケースで exit 0 が返っていた。CLI utility としては「API エラー時は exit !=0」に揃えるのが自然だが、揃えるなら全コマンドの error path を見直す必要があり scope はそれなりに大きい。要件として整理してから着手。

---

## セキュリティ・認証

[README の「制約事項」](../README.ja.md#制約事項) で「実装予定」と表明している項目。公開ドキュメントで公約済のため、本セクションの優先度は他セクションより明確に高い。

### OAuth 認証

未実装。当面は API トークン / パスワード認証のみ利用可能。kintone OAuth は token endpoint と refresh token のフローまで含めて整理が必要。

### 応答サニタイズ (`--sanitize`)

未実装。kintone レコード値はエージェントから見て「信頼できない入力」（プロンプトインジェクションを含みうる）として扱う必要があり、`--sanitize` フラグで危険文字や制御コード等を除去するオプションが要る。実装までの間、README で「サニタイズ前提のコンテキスト投入は避けるべき」と注意喚起している。

### 入力ハードニング

スキーマレベルの検査（typo・必須・型）は実装済。文字列レベル（ファイルパス・制御文字・URL エンコーディング等）のハードニングは部分実装。詳細は [`SECURITY.md`](../SECURITY.md) を参照。

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

### `release.yml` 整備（タグ push → 自動 publish + provenance）

0.7.0 以降の自動化として導入。

- `NPM_TOKEN` を GitHub Secrets に登録、`id-token: write` 権限設定が必要
- GitHub Settings → Actions → "Allow GitHub Actions to create..." 等の OIDC 設定
- 切替時に npmjs.org の package ページに provenance バッジが付くようになる

0.6.x までは 2FA Passkey ダイアログを Bash 経由で扱えない事情からユーザー側ターミナルで `npm publish` を手動実行している。

### SKILL.md frontmatter `version` の自動反映

Phase 9 で `commander.version()` は `package.json` から `createRequire` で動的取得するように修正したが、`skills/kt/SKILL.md` の frontmatter `version` は依然手書き。release 毎の bump 漏れが再発する構造が残っている。

候補アプローチ:

- `scripts/build-spec.mjs` ないし `prepack` で `package.json` の version を読んで `skills/kt/SKILL.md` の frontmatter `version` 行を書き換える
- もしくは `version` フィールドを SKILL.md から削除（agentskills.io 仕様で optional なら）

### `npm publish --tag next` での先出し戦略

`0.6.0-rc.0` のような pre-release を `next` tag で出してから安定版に昇格、というやり方。個人プロジェクトの粒度ではオーバーキルの可能性、必要時のみ検討。

---

## ドキュメント

### README に GIF / asciinema デモ

CLI の代表シナリオ（record get / record add / `--schema` / `bulk-request`）の操作デモを README に埋め込む。

### `CODE_OF_CONDUCT.md` 整備

実コミュニティ活動が立ち上がってから整備すれば足りる。プレースホルダーとしての追加は不要。
