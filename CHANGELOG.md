# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - TBD

### Added

- Initial public release on [npmjs.org](https://www.npmjs.com/package/@yoshkosh/kintone-cli).
- `LICENSE` (MIT), `THIRD_PARTY_NOTICES.md` (Apache-2.0 attribution for the
  bundled kintone OpenAPI Specification), `CHANGELOG.md`, `CONTRIBUTING.md`,
  `SECURITY.md`, `AGENTS.md`, and English `README.md` / Japanese `README.ja.md`.

### Changed

- `engines.node` is now `>=22` to align with the project's use of Node's
  built-in `fetch` and the Node 20 LTS end-of-active-support window.
- `package.json` `description`, `keywords`, `author`, `homepage`, `bugs`,
  `repository`, `files`, `bin`, and `scripts` reworked for npmjs.org publication.
- Repository switched to `pnpm` as the canonical package manager
  (`packageManager` field, CI uses `pnpm install --frozen-lockfile`).

### Removed

- `publishConfig.registry` pointing at GitHub Package Registry; package now
  publishes to the public npm registry only.

## [0.5.5] - 2026-05-03

### Added

- Two-stage validation of `bulk-request add --json` payloads. Each
  `requests[i].payload` is checked against the sub-schema selected by its
  `(method, api)` pair, in addition to the bulk envelope schema. Unknown or
  case-mismatched `(method, api)` combinations now surface as
  `bulkRequestUnknownSubapi` instead of opaque `anyOf` failures.

## [0.5.4] - 2026-05-02

### Added

- `--json` payload validation against the OpenAPI Specification on every
  endpoint command that accepts `--json` (Ajv at runtime). Validation errors
  are emitted to stderr as JSON (`{ error: "json_validation_failed", ... }`)
  with exit code 1.
- `--skip-validation` opt-out flag installed across all `--json` endpoints,
  with a stderr notice when used.

### Changed

- `ajv` and `yaml` promoted from dev dependencies to align with the runtime
  validation flow. `coerceTypes` mutations are confined to a `structuredClone`
  copy so the wire payload is unmodified.

## [0.5.3] - 2026-05-02

### Added

- `--schema` option on every endpoint command. Emits the OpenAPI
  `{ method, path, operation }` for that command as compact JSON, with zero
  side effects (no auth, no required-option enforcement, no API call).
- Build-time emission of `dist/spec.json` for runtime schema lookup.

## [0.5.2] - 2026-04-06

### Changed

- Documentation restructure: split into `docs/spec.md`, `docs/decisions.md`,
  `docs/ideas.md`, `docs/log.md`. No CLI behavior change.

## [0.5.1] - 2026-04-03

### Changed

- Package scope renamed from `@latica-jp/kintone-cli` to
  `@yoshkosh/kintone-cli`, following a GitHub username change. Distribution
  remained on the GitHub Package Registry at this point.

## [0.5.0] - 2026-03-31

### Changed

- Short CLI command renamed from `ktc` to `kt`. The longer `kintone-cli`
  binary continues to be installed alongside it.

## [0.1.0] – [0.4.0] - 2026-03

### Added

- Initial development cycle, distributed only via the GitHub Package Registry
  for dogfooding. Establishes the API-path-aligned command tree, environment-
  variable authentication (password / API token / OAuth bearer), NDJSON
  cursor streaming for `records get --page-all`, `--guest-space-id` flag,
  preview-API subcommands, ACL commands, app-settings commands (table-driven),
  comment APIs, and the `bulk-request` / `plugin` / `space` / `guests` /
  `statistics` commands. See git history for per-commit detail.

[Unreleased]: https://github.com/yoshkosh/kintone-cli/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.5...v0.6.0
[0.5.5]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/yoshkosh/kintone-cli/releases/tag/v0.5.0
