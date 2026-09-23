# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-09-23

### Changed

- The bundled OpenAPI Specification now comes from
  [kintone/openapi-spec](https://github.com/kintone/openapi-spec) (tag `v1`,
  `info.version` `2026.8.31`, OpenAPI 3.0.3, MIT-0) instead of the archived
  `kintone/rest-api-spec` (Apache-2.0). The vendored copy moved to
  `third_party/openapi-spec/openapi.yaml`, and both `THIRD_PARTY_NOTICES.md`
  and the `x-kintone-cli-provenance` stamp in `dist/spec.json` record the new
  origin, tag, and license.
- **Breaking:** DELETE commands (`records delete`, `record comment delete`,
  `preview app form-fields delete`, `space delete`, `plugin delete`,
  `guests delete`, and the cursor cleanup behind `records get --page-all`)
  now send their parameters as a JSON request body instead of a query
  string. The new specification defines these parameters in `requestBody`,
  and the official documentation shows the same form. The `--dry-run` output
  of these commands therefore has a `body` key where it previously had
  `params`. `records delete --json` is validated against that `requestBody`
  like every other write command.
- **Breaking:** `space guests update` now requires `--guest-space-id` and
  fails before any request when it is omitted. The API exists only under the
  guest-space path (`/k/guest/{guestSpaceId}/v1/space/guests.json`); without
  the flag the CLI used to call a path that does not exist. Its `--schema`
  output now returns that guest-space path definition regardless of
  `--guest-space-id` (the one exception to "`--schema` returns the non-guest
  path").
- Invalid numeric input now fails before any request instead of being sent
  as-is or silently converted: `--guest-space-id` must be a positive
  integer (a non-numeric value or `0` used to leave the path unrewritten),
  and integer-valued flags that are sent in a JSON body (`--app`, `--record`,
  `--comment`, `--id` of `space delete`, `--revision`) must be integers
  (`Number()` used to turn `abc` into `null` and an empty value into `0`).

## [0.7.3] - 2026-06-27

### Changed

- `skills/kt/SKILL.md`: jq field access is now an unconditional rule —
  always use the dot quoted-key form (`."records"[]."名前"."value"`)
  regardless of whether the field code is ASCII or non-ASCII. The previous
  "only non-ASCII codes need quoting" guidance required agents to classify
  each code at command-construction time, and bare paths were still being
  written first and retried after jq's `INVALID_CHARACTER` syntax error.
  The quoting guidance is promoted to its own `CRITICAL: jq field access`
  section placed before Authentication, the bracket form is dropped to
  leave a single canonical form, and every jq example in the file (Bash
  rules, Schema self-inspection, Examples) is converted to the dot quoted
  form. No CLI behavior change.

## [0.7.2] - 2026-06-22

### Changed

- `skills/kt/SKILL.md`: clarified jq usage with non-ASCII field codes
  (Japanese, Chinese, etc.). Bare `.名前` is a jq syntax error; the
  quoted-key forms `."名前"` and `["名前"]` are now shown with explicit
  WRONG/RIGHT examples in the Bash command formatting rules section,
  and an additional Examples entry demonstrates projecting records via
  non-ASCII field codes. Removed the misleading "rename to ASCII via
  `--fields`" hint (the `--fields` flag selects fields, it does not
  rename them).

## [0.7.1] - 2026-06-08

### Changed

- `skills/kt/SKILL.md`: agents now run `kt` first and fall back to
  `npx -y @yoshkosh/kintone-cli` only when `kt` is absent from PATH
  (exit code 127 / `command not found`). API errors and argument errors
  do not trigger the fallback. Once the fallback fires, `npx` is used
  for the rest of the session to avoid repeated failed `kt` calls.

## [0.7.0] - 2026-05-17

### Added

- `--json` now accepts `@path` to read the payload from a file, matching the
  `curl -d @file.json` / `gh api --input @file.json` convention. Lets large
  payloads bypass the shell's ARG_MAX limit (around 1 MB on macOS, around
  2 MB on Linux — the effective ceiling is lower because it shares the limit
  with environment variables). The prefix is checked only at the first
  character of the argument, so payload values like `{"link":"@somewhere"}`
  are unaffected. See `skills/kt/SKILL.md` for usage.

## [0.6.2] - 2026-05-09

### Changed

- All user-facing surfaces now explicitly state that this CLI is an
  unofficial third-party tool, not affiliated with or endorsed by Cybozu,
  Inc. (the vendor of kintone). Updated: `kt --help` description, npm
  package description, `README.md`, `README.ja.md`, `skills/kt/SKILL.md`,
  `SECURITY.md`, and `AGENTS.md`. No runtime behavior change.

### Added

- Prettier (3.x) as the canonical source-code formatter. New files:
  `.prettierrc.json` (`printWidth: 100`, `trailingComma: "all"`, defaults
  otherwise — `singleQuote` stays `false` to match the existing codebase),
  `.prettierignore`, and `format` / `format:check` npm scripts.
  Repository contents have been reformatted accordingly.

## [0.6.1] - 2026-05-06

### Fixed

- `kt --version` / `kintone-cli --version` now correctly reports the package
  version. In 0.6.0 the `commander` `.version()` argument was hard-coded to the
  previous release string and was not bumped during the 0.6.0 release, so the
  CLI reported an outdated version. The version is now read from `package.json`
  at runtime so manual bumps are no longer required.

## [0.6.0] - 2026-05-06

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

[Unreleased]: https://github.com/yoshkosh/kintone-cli/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/yoshkosh/kintone-cli/compare/v0.7.3...v0.8.0
[0.7.3]: https://github.com/yoshkosh/kintone-cli/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/yoshkosh/kintone-cli/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/yoshkosh/kintone-cli/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/yoshkosh/kintone-cli/compare/v0.6.2...v0.7.0
[0.6.2]: https://github.com/yoshkosh/kintone-cli/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/yoshkosh/kintone-cli/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/yoshkosh/kintone-cli/releases/tag/v0.6.0
[0.5.5]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/yoshkosh/kintone-cli/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/yoshkosh/kintone-cli/releases/tag/v0.5.0
