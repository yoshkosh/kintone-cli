# これからやること・アイディア

post-release backlog。エージェントが進捗に応じて section 間で項目を移動する前提で運用する。

- **Now**: 着手中 or 着手間近。常時 1〜3 件に絞る（focus 維持のため）。
- **Next**: 次サイクルで取り組む見通しのもの。
- **Later**: 計画段階。優先度低 or 余裕ができてから。
- **Iceberg**: scope が未確定 / 必要時のみ検討するアイディア。

各エントリは `<!-- meta: 種別 / 由来 -->` を持つ。

- 着手時: Next → Now、メタに `着手 YYYY-MM-DD` を追記。
- 完了時: ideas.md からは削除（git 履歴で十分）。決定が記録に値するなら [decisions.md](decisions.md) へ、仕様変更なら [spec.md](spec.md) を更新。
- scope が固まったら: Iceberg → Later or Next。

種別: `security` / `auth` / `feat` / `quality` / `ops` / `docs`
由来: `README-promise` / `phase9-followup` / `phase9-observation` / `existing` / `on-demand` / `scope-undecided`

---

## Now

（該当なし）

---

## Next

### Node.js 要件の緩和 (`>=22` → `>=20`)

<!-- meta: ops / on-demand -->

現在の `engines.node: ">=22"` は厳しすぎる。ランタイム依存（`commander@14` が `>=20` 要件、`ajv` は制約なし）と、実コードが利用する Web API（global `fetch` / `FormData` / `structuredClone` は Node 18+ で利用可）から、コード変更なしで `>=20` まで下げられる。Node 18 までの緩和は `commander` を 13.x に固定する必要があり実利が薄い（Node 18 は 2025-04-30 EOL、Node 20 も 2026-04-30 EOL 入りだが、Node 22 への移行猶予として現実的）。

DoD: `package.json` の `engines.node` を `">=20"` に変更、README (英/日) の Prerequisite を "Node.js 20 or newer" に更新、CI matrix に `20.x` を追加。

### OAuth 認証

<!-- meta: auth / README-promise -->

未実装。当面は API トークン / パスワード認証のみ利用可能。kintone OAuth は token endpoint と refresh token のフローまで含めて整理が必要。

DoD: `--auth-type oauth` で OAuth クライアント認証フローが実行可能、refresh token 自動更新、README「制約事項」から該当行を削除。

### 応答サニタイズ (`--sanitize`)

<!-- meta: security / README-promise -->

kintone レコード値はエージェントから見て「信頼できない入力」（プロンプトインジェクションを含みうる）として扱う必要があり、`--sanitize` フラグで危険文字や制御コードを除去するオプションが要る。実装までの間、README で「サニタイズ前提のコンテキスト投入は避けるべき」と注意喚起している。

DoD: `--sanitize` 実装 + テスト追加 + README「制約事項」から該当行を削除。

### 入力ハードニング

<!-- meta: security / README-promise -->

スキーマレベルの検査（typo・必須・型）は実装済。文字列レベル（ファイルパス・制御文字・URL エンコーディング等）のハードニングは部分実装。詳細は [`SECURITY.md`](../SECURITY.md) を参照。

DoD: `SECURITY.md` に挙げた残項目（ファイルパス・制御文字・URL エンコーディング）を順次塞ぐ。完了次第 README「制約事項」から該当行を削除。

### preview/live 用語のドキュメント統一

<!-- meta: docs / on-demand -->

`SKILL.md` のドッグフーディング中に「live 環境」が一般 kintone 利用者にとって聞き覚えのない表現であることが判明。公式表記を再調査したところ、英語版でも 2 系統のブレがあった:

- 開発者ドキュメント (kintone.dev) / OpenAPI Spec: `pre-live` settings/App、`live` settings/App
- エンドユーザーヘルプ (kintone.help EN): UI 機能名 `Preview` + `test environment`、本番側は `actual environment` / `live App`
- 日本語ヘルプ: 「動作テスト環境」「テスト環境」「プレビュー」 / 「運用環境」「運用中のアプリ」「公開中のアプリ」

方針: CLI のサブコマンド名（`kt preview app ...`）と一致するメリットが大きく、開発者ドキュメントとも整合するため `preview` / `live` を維持する。ただし `live` は一般利用者に馴染みが薄いので、最初の出現箇所で訳語を注記する。`pre-live` は Spec 限定のマイナー表記なので採用しない。

ファイル別の対応:

- `skills/kt/SKILL.md` (英語): `preview` / `live` を維持、最初の出現で「(= テスト環境 / 運用環境)」相当の注記を追加
- `README.md` (英語): `preview environment` / `live environment` で統一（現在 `production` 表記の箇所を寄せる）
- `README.ja.md` (日本語): 概念説明では「テスト環境」「運用環境」、CLI のサブコマンド名としての `preview` は維持
- `docs/spec.md` / `docs/decisions.md` / `prompts/*.md`: 内部設計・作業メモなので現状維持（識別子としての `live`/`preview`）

DoD: 上記 4 ファイルの表記が方針どおりに統一され、SKILL.md / README (英・日) のいずれを読んでも preview/live と テスト/運用 の対応関係が初出箇所で把握できる。

---

## Later

### エラーレスポンスの構造化アサーション（Layer B）

<!-- meta: quality / existing -->

現状エラーテストは Layer A（透過出力の単純検証）のみ。`KintoneAPIError` の構造化設計とセットで、`{id, code, message}` 3 フィールドを構造化アサーションする Layer B を導入する。

DoD: `KintoneAPIError` の型定義 + 主要エラーパスに対する `{id, code, message}` の構造化アサーション。

### カバレッジ計測

<!-- meta: quality / existing -->

`vitest --coverage` を導入する。レイヤ別ポリシー（pure / 統合 / ヘルパで異なる目標値）の適用を検討。

DoD: `vitest --coverage` が CI で動作、レイヤ別目標値が `decisions.md` に記録、CI で目標値割れ時に fail。

### Tier 2 手動スモーク

<!-- meta: quality / existing -->

リリース前運用として、5〜10 ケースの手動スモークを整備する。

DoD: 5〜10 ケースの手順書（`docs/` 配下 or `reports/`）+ リリース前チェックリストへの組み込み。

### `release.yml` 整備（タグ push → 自動 publish + provenance）

<!-- meta: ops / phase9-followup -->

0.7.0 以降の自動化として導入。

- `NPM_TOKEN` を GitHub Secrets に登録、`id-token: write` 権限設定が必要
- GitHub Settings → Actions → "Allow GitHub Actions to create..." 等の OIDC 設定
- 切替時に npmjs.org の package ページに provenance バッジが付くようになる

0.6.x までは 2FA Passkey ダイアログを Bash 経由で扱えない事情から、ユーザー側ターミナルで `npm publish` を手動実行している。

DoD: タグ push を契機に `npm publish --provenance` が自動実行、provenance バッジ付与。

### SKILL.md frontmatter `version` の自動反映

<!-- meta: ops / phase9-followup -->

Phase 9 で `commander.version()` は `package.json` から `createRequire` で動的取得するように修正したが、`skills/kt/SKILL.md` の frontmatter `version` は依然手書き。release 毎の bump 漏れが再発する構造が残っている。

候補アプローチ:

- `scripts/build-spec.mjs` ないし `prepack` で `package.json` の version を読んで `skills/kt/SKILL.md` の frontmatter `version` 行を書き換える
- もしくは `version` フィールドを SKILL.md から削除（agentskills.io 仕様で optional なら）

DoD: SKILL.md frontmatter の `version` が release 時に自動同期される、もしくは仕様上 optional ならフィールド自体を削除。

### README に GIF / asciinema デモ

<!-- meta: docs / existing -->

CLI の代表シナリオ（record get / record add / `--schema` / `bulk-request`）の操作デモを README に埋め込む。

DoD: README に動作デモ（GIF or asciinema cast）を 1 件以上掲載。

---

## Iceberg

### `--schema` 拡張（第二弾以降）

<!-- meta: feat / scope-undecided -->

第一弾実装（2026-05-02、各エンドポイントコマンドに `--schema` を追加）は decisions.md 記録済み。残課題:

- 引数なし `kt --schema`: 全エンドポイント一覧 / インデックス出力。スコープと出力形式が未確定。
- `$ref` の dereference: 現状は spec のまま切り出すため `#/components/schemas/...` が残る。LLM 側で扱いづらい場面が出れば対応。
- `components.schemas` の併出: ref 解決と同様、参照先の schema を含めて返す案。

scope を固める際: 上記 3 点のどれを優先するか、出力形式（フラット vs ネスト）を決定したうえで Later or Next へ移す。

### 出力フォーマットオプション

<!-- meta: feat / scope-undecided -->

`--format table` 等の人間向け出力フォーマット。2026-03-12 の初期リリース判断で見送り。JSON 出力のみで AI エージェント用途には十分だが、人間が直接使う場面では不便。

scope を固める際: 対象 user persona（人間 / エージェント）と表示崩れ時のフォールバック方針を決定。

### API エラー時の exit code 一貫性

<!-- meta: feat / phase9-observation -->

Phase 9 検証中に観察: `kt record get` が kintone API エラー（権限不足など）を返すケースで exit 0 が返っていた。CLI utility としては「API エラー時は exit !=0」に揃えるのが自然だが、揃えるなら全コマンドの error path を見直す必要があり scope はそれなりに大きい。

scope を固める際: 「kintone エラーは全て exit !=0」 or 「permission / notfound 系のみ exit !=0」のどちらに倒すか先に決定。

### `npm publish --tag next` での先出し戦略

<!-- meta: ops / on-demand -->

`0.6.0-rc.0` のような pre-release を `next` tag で出してから安定版に昇格、というやり方。個人プロジェクトの粒度ではオーバーキルの可能性。実コミュニティが立ち上がり、リリース前検証が必要になったタイミングで再検討。

### `CODE_OF_CONDUCT.md` 整備

<!-- meta: docs / on-demand -->

実コミュニティ活動が立ち上がってから整備すれば足りる。プレースホルダーとしての追加は不要。
