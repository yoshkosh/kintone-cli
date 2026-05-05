# kintone-cli

> Schema-validated kintone REST API CLI for AI agents and humans.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

`kt` is a thin, predictable façade over the [kintone REST API](https://kintone.dev/en/docs/kintone/rest-api/), designed first for AI agents (Claude Code, Codex, …) and equally usable by humans. Every endpoint command is generated from the kintone official [OpenAPI Specification](https://github.com/kintone/rest-api-spec) — the same spec is bundled at runtime to validate `--json` payloads *before* a request goes out and to serve `--schema` introspection without an API call.

日本語版: [README.ja.md](README.ja.md)

## Why this exists

LLM-powered agents need a kintone interface that fails fast on the *agent's* machine, not on kintone's. The CLI is built around three properties:

- **Predictable command tree** — `kt <noun> <verb>` mirrors the REST API path layout, so `/k/v1/record.json` POST is always `kt record add`. No human-friendly aliases, no inferred shortcuts.
- **Schema-validated `--json`** — every write payload is checked against the vendored OpenAPI Spec at runtime via Ajv. Typos like `"rcord"` or missing required keys are rejected on stderr with a structured JSON error and exit code 1, *before* the HTTP call.
- **Self-describing endpoints** — append `--schema` to any endpoint command to print its OpenAPI operation as JSON. No auth, no API call, no required options. An agent can introspect the wire shape without ever touching kintone.

The companion [`skills/kt/SKILL.md`](skills/kt/SKILL.md) ships with the package and is the user-facing surface for AI agents — register it with Claude Code (or another agent runtime that consumes Skills) and the agent gains a documented command map plus the safety rails above.

## Requirements

- **Node.js 22 or later.** The CLI uses Node's built-in `fetch` and other recent platform features. If you are on Node 20:

  ```bash
  nvm install 22
  nvm use 22
  ```

- A kintone tenant with credentials (API token, password, or OAuth — see [Authentication](#authentication)).

## Installation

```bash
# Install globally
npm install -g @yoshkosh/kintone-cli

# Or run on demand without installing
npx @yoshkosh/kintone-cli --help
```

The package installs two binaries:

| Binary | Description |
|--------|-------------|
| `kt` | Short form, used in all examples and in `SKILL.md`. |
| `kintone-cli` | Long form, identical behavior. |

### `kt` is on your PATH already? Resolving conflicts

`kt` is a short, popular name — it commonly collides with the [k0sproject `kt` tool](https://github.com/k0sproject/kt), with personal aliases for `kubectl`, with the [k14s `kapp`/`kbld`/`ytt` family](https://carvel.dev/), or with whatever a previous `npm install -g` left behind. Check what your shell will run before assuming:

```bash
command -v kt
type -a kt
```

If `kt` already resolves to something else, do **one** of:

- Use the long binary instead: `kintone-cli record get --app 1 --id 1`.
- Run via `npx`: `npx @yoshkosh/kintone-cli record get --app 1 --id 1`.
- Add a local alias in your shell rc:

  ```bash
  alias kt-kintone='kintone-cli'
  ```

Examples in this README and in `SKILL.md` use `kt`. Substitute one of the options above if you have a conflict — no behavior changes.

## Authentication

Credentials are taken from environment variables. Manage them with whatever tool you already use (`direnv`, `1Password`, macOS Keychain, your shell rc). The CLI does **not** read or write a config file.

| Variable | Required | Notes |
|----------|----------|-------|
| `KINTONE_BASE_URL` | Always | e.g. `https://example.cybozu.com` |
| `KINTONE_API_TOKEN` | Pick one | Per-app token, comma-separated for cross-app calls |
| `KINTONE_USERNAME` + `KINTONE_PASSWORD` | Pick one | Password authentication |
| `KINTONE_OAUTH_CLIENT_ID` + `KINTONE_OAUTH_CLIENT_SECRET` + `KINTONE_OAUTH_REFRESH_TOKEN` | Pick one | OAuth — wiring is in place; token exchange is not yet implemented |

If more than one method is detected, a warning is printed and the first match wins. Pass `--auth-type api-token` (or `password` / `oauth`) to be explicit.

## Command basics

Top-level commands track the kintone REST API path layout:

```text
kt preview                Preview (pre-live) operations (/k/v1/preview)
kt record / kt records    Single- vs. multi-record operations
kt bulk-request           /k/v1/bulkRequest
kt file                   /k/v1/file
kt app / kt apps          App / app-list operations
kt field-acl              /k/v1/field/acl
kt space / kt spaces      Space and space-list operations
kt template               Template operations
kt guests                 Guest user operations
kt plugin / kt plugins    System plugin operations
```

Run `kt --help` for the live list, `kt <cmd> --help` for any sub-tree, and see [`skills/kt/SKILL.md`](skills/kt/SKILL.md) for the full command map with one-line descriptions.

### Common flags

| Flag | Applies to | Description |
|------|------------|-------------|
| `--auth-type <type>` | global | `api-token`, `password`, `oauth` |
| `--guest-space-id <id>` | most endpoints | Guest space prefix; ignored on system-level endpoints |
| `--json <payload>` | write commands | Raw kintone request body — validated before send |
| `--dry-run` | write commands | Print the request, skip the HTTP call |
| `--schema` | every endpoint | Print the OpenAPI operation as JSON; no auth, no API call |
| `--skip-validation` | every `--json` command | Bypass payload validation (last-resort escape hatch) |

## Examples

```bash
# Get a single record
kt record get --app 42 --id 1

# Search records and filter the response shape
kt records get --app 42 --query 'Status = "Done"' --fields "Record_number,Name"

# Stream every record as NDJSON, post-process with jq
kt records get --app 42 --page-all --fields "Record_number,Name" \
  | jq 'select(.Name.value | test("Tanaka"))'

# Add a record — dry-run first, then commit
kt record add --dry-run --json '{"app": 42, "record": {"Name": {"value": "New"}}}'
kt record add --json '{"app": 42, "record": {"Name": {"value": "New"}}}'

# Bulk request (the bulkRequest endpoint accepts only write methods)
kt bulk-request add --dry-run --json '{"requests": [{"method": "POST", "api": "/k/v1/record.json", "payload": {"app": 1, "record": {"Name": {"value": "New"}}}}]}'

# Inspect the wire shape without calling the API
kt record add --schema | jq .operation.requestBody
kt records get --schema | jq '.operation.parameters[] | select(.in == "query") | .name'

# Pre-live (preview) workflow: edit settings, then deploy
kt preview app settings update --dry-run --json '{"app": 42, "name": "Renamed"}'
kt preview app deploy add --json '{"apps": [{"app": 42}]}'
kt preview app deploy get --apps 42

# App permissions
kt app acl get --app 42
kt field-acl get --app 42

# Spaces
kt space get --id 1
kt space members get --id 1
```

## `--json` validation, in one minute

Every `--json` payload is validated against the kintone OpenAPI Spec before the API call — including under `--dry-run`. Missing required keys, wrong types that can't be coerced, and stray top-level keys are rejected with a JSON error on stderr and exit code 1.

```bash
$ kt record add --json '{}'
{"error":"json_validation_failed","method":"POST","path":"/k/v1/record.json","errors":[{"instancePath":"","keyword":"required","message":"must have required property 'app'","params":{"missingProperty":"app"}},{"instancePath":"","keyword":"required","message":"must have required property 'record'","params":{"missingProperty":"record"}}]}
$ echo $?
1
```

The `params` block is intentionally machine-readable: agents can recover from `params.missingProperty` (an absent required key) and `params.additionalProperty` (a likely typo such as `"rcord"`) without parsing the message string.

For `bulk-request add`, every `requests[i].payload` is validated against the *sub-schema* selected by its `(method, api)` pair, not just the outer envelope, so misshapen sub-payloads surface at the right path. Unknown or case-mismatched `(method, api)` combinations are rejected with the `bulkRequestUnknownSubapi` keyword.

If the spec is wrong (out of date, over-strict) and kintone would actually accept the payload, append `--skip-validation`. A stderr notice is printed on every use so the bypass is auditable in logs.

## `--schema` self-inspection

```bash
kt record add --schema | jq .
kt preview app form-fields update --schema | jq .operation.requestBody.content
```

`--schema` prints `{ method, path, operation }` for the endpoint as compact JSON. With it:

- No HTTP call is made.
- `KINTONE_BASE_URL` and authentication are not required.
- `--guest-space-id` is ignored — guest paths share the same operation in the spec, so the non-guest path is returned.
- Required options are skipped (`kt record add --schema` works without `--json`).
- Combined with `--dry-run`, only the schema is printed.

## Using the bundled Claude Code skill

The package ships [`skills/kt/SKILL.md`](skills/kt/SKILL.md) — a ready-to-use [Claude Code Skill](https://docs.claude.com/en/docs/claude-code/skills) that documents the full command map, payload validation behavior, and agent-safe Bash patterns.

To register it with Claude Code:

1. Install the CLI so `kt` is available on `PATH`:

   ```bash
   npm install -g @yoshkosh/kintone-cli
   ```

2. Copy (or symlink) the bundled skill directory into your Claude Code skills folder:

   ```bash
   mkdir -p ~/.claude/skills
   cp -R "$(npm root -g)/@yoshkosh/kintone-cli/skills/kt" ~/.claude/skills/
   ```

3. Confirm Claude Code picks it up (the skill name is `kt`):

   ```bash
   ls ~/.claude/skills/kt/SKILL.md
   ```

The skill file is plain Markdown and can be inspected before installation. It contains no executable code; it only constrains how the agent shapes `kt` commands.

## Third-party material

`dist/spec.json` is derived from [`kintone/rest-api-spec`](https://github.com/kintone/rest-api-spec) (Apache License 2.0) — bundled unmodified in content (YAML → JSON serialization only) so payload validation and `--schema` work offline. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the full attribution and license reference.

## Documentation map

- [`skills/kt/SKILL.md`](skills/kt/SKILL.md) — full command map, written for AI agents (English).
- [`AGENTS.md`](AGENTS.md) — conventions for contributors and coding agents working *on* this repository (English).
- [`docs/decisions.md`](docs/decisions.md) — Architectural Decision Records, written in Japanese.
- [`docs/spec.md`](docs/spec.md), [`docs/ideas.md`](docs/ideas.md), [`docs/log.md`](docs/log.md) — internal design notes (Japanese).
- [`CHANGELOG.md`](CHANGELOG.md) — versioned change history.
- [`SECURITY.md`](SECURITY.md) — vulnerability reporting.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to file issues and PRs.

## External references

- [kintone REST API documentation](https://kintone.dev/en/docs/kintone/rest-api/)
- [kintone OpenAPI Specification](https://github.com/kintone/rest-api-spec)
- [Claude Code Skills documentation](https://docs.claude.com/en/docs/claude-code/skills)

## Contributing and feedback

Issues and pull requests are welcome — please keep them constructive. Bug reports are most useful when they include a minimal reproduction and your `kt --version` / `node --version`. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the short version of the workflow and [`SECURITY.md`](SECURITY.md) for private vulnerability reporting.

## License

[MIT](LICENSE) © Isao Yoshikoshi. Bundled third-party material is governed by its own license, reproduced in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
