# kintone-cli

**[日本語版](README.ja.md)**

A command-line tool for the kintone REST API, designed for use by AI agents and ergonomic for human operators.

> [!NOTE]
> This is an unofficial third-party tool, not affiliated with Cybozu, Inc.

> The design draws on Justin Poehnelt's article [_Rewrite your CLI for AI Agents_](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/).

---

## Designed for AI agents

### Expose the command surface upfront via SKILL.md and `--schema`

Agents learn the command list and usage from SKILL.md, then fill in any gaps via `--schema` and the 1:1 mapping to API paths.

- **Bundled skill for AI agents**
  - [`skills/kt/SKILL.md`](skills/kt/SKILL.md) ships in the npm package (compliant with the [agentskills.io specification](https://agentskills.io/specification))
  - Once registered with an agentskills.io-compatible runtime such as Claude Code, the agent understands how to use this tool the moment the skill is loaded
- **Schema self-inspection (`--schema`)**
  - Each endpoint command prints the OpenAPI definition for its corresponding API endpoint (request body shape, parameter types, required fields) as JSON to stdout
  - No credentials, `KINTONE_BASE_URL`, or required options needed
  - No network traffic
- **Command structure mirrors API paths** — every command maps 1:1 to a kintone REST API path and HTTP method (e.g., `POST /k/v1/record.json` → `kt record add`)

### Adapt to the agent's runtime with `--fields`, `--page-all`, and env-var auth

Designed around agent-side constraints such as context window size and authentication paths.

- **Field projection (`--fields`)** — limit the fields returned by `records get` to keep response sizes small
- **Stream every record via the cursor API (`--page-all`)**
  - `records get --page-all` retrieves every record using the cursor API (the default fetches a single page, up to 500 records)
  - Output is an NDJSON stream (one JSON object per line), so it can be processed without buffering and without overflowing the context window
- **Environment-variable authentication** — credentials are read only from environment variables; no config files, no browser redirects. Friendly to agent runtimes, CI, and containers.

#### Example: stream only the fields you need as NDJSON

```sh
$ kt records get --app 42 --fields "Title,Status" --page-all
{"Title":{"value":"Quote request A"},"Status":{"value":"open"}}
{"Title":{"value":"Quote request B"},"Status":{"value":"closed"}}
{"Title":{"value":"Quote request C"},"Status":{"value":"open"}}
...
```

- `--fields` narrows the result to two fields, and `--page-all` emits one record per line as NDJSON
- Pipe through `| jq 'select(.Status.value == "open")'` to filter mid-stream, or `| head -n 100` to take only the first few
  - Even with very large result sets, you never have to load the entire result into the agent's context

### Local validation before sending

Catch malformed requests before they reach the network.

- **`--json` with pre-flight validation**
  - Validated against the bundled OpenAPI schema before any HTTP request is made
  - Errors are returned as structured JSON. Keys such as `additionalProperty` and `missingProperty` let an agent correct its own output
  - `bulk-request add`, which sends multiple API calls together, also validates each sub-request individually against the schema for its target API. Errors include a path such as `/requests/0/payload` so you can identify and fix only the offending sub-request
- **Dry run for pre-flight inspection**
  - Pass `--dry-run` on a write command to print the HTTP method, URL, and body that would be sent
  - No request is issued
  - `--json` validation still runs under `--dry-run`, so you can validate a payload without sending it

#### Example: catch a typo before sending

```sh
$ kt record add --json '{"app":1,"rcord":{"name":{"value":"x"}}}' --dry-run
{"error":"json_validation_failed","method":"POST","path":"/k/v1/record.json",
 "errors":[
   {"instancePath":"","keyword":"required",
    "params":{"missingProperty":"record"}},
   {"instancePath":"","keyword":"additionalProperties",
    "params":{"additionalProperty":"rcord"}}
 ]}
```

- The top-level key `record` is mistyped as `rcord`
- Pre-flight validation fails and returns machine-readable details: `params.missingProperty: "record"` and `params.additionalProperty: "rcord"`
- The agent can read these values and fix its own output
- No HTTP request is sent, so no kintone rate limit is consumed and no tokens are spent parsing an error response

---

## Setup

### Prerequisites

- Node.js 22 or newer
- A reachable kintone environment with the appropriate access rights

### Installation

```sh
npm install -g @yoshkosh/kintone-cli
```

After installation, both `kt` and `kintone-cli` invoke the tool. This document uses `kt`.

Verify the install:

```sh
kt --version
```

#### Optional: install the AI-agent skill

Skip this section if you are not using the tool from an AI agent.

The skill definition ships under `skills/` in the GitHub repository, and `npx skills` can register it directly from a GitHub URL (no `npm install -g` required for the CLI itself).

```sh
# Example for Claude Code (fetched directly from GitHub)
npx skills add https://github.com/yoshkosh/kintone-cli -g -a claude-code -y
```

- The skill file conforms to the agentskills.io specification, so any compatible runtime can use it
- See [`skills/kt/SKILL.md`](skills/kt/SKILL.md) for agent-facing details

### Connecting to kintone

`kt` reads credentials from environment variables only — no config files. Three authentication methods are supported:

| Method    | Required environment variables                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| API token | `KINTONE_BASE_URL`, `KINTONE_API_TOKEN`                                                                     |
| Password  | `KINTONE_BASE_URL`, `KINTONE_USERNAME`, `KINTONE_PASSWORD`                                                  |
| OAuth     | `KINTONE_BASE_URL`, `KINTONE_OAUTH_CLIENT_ID`, `KINTONE_OAUTH_CLIENT_SECRET`, `KINTONE_OAUTH_REFRESH_TOKEN` |

> OAuth is not yet implemented (see "Limitations" below). For now, use API token or password authentication.

- The table is ordered by priority. When credentials for multiple methods are present, `kt` prints a warning and uses the first method whose credentials it can resolve, top to bottom
- Pass `--auth-type api-token|password|oauth` to make the choice explicit

Smoke test (API token):

```sh
export KINTONE_BASE_URL="https://your-subdomain.cybozu.com"
export KINTONE_API_TOKEN="..."
kt app get --id <appId>
```

---

## Usage

### Find a CLI command from a REST API path and method

| kintone REST API                         | `kt` command                               |
| ---------------------------------------- | ------------------------------------------ |
| `GET /k/v1/record.json`                  | `kt record get`                            |
| `POST /k/v1/records.json`                | `kt records add`                           |
| `PUT /k/v1/preview/app/form/fields.json` | `kt preview app form-fields update`        |
| `POST /k/guest/{spaceId}/v1/record.json` | `kt record add --guest-space-id <spaceId>` |

- **`preview`** — modeled as a subcommand hierarchy, not a flag. This structurally prevents mixing up production and preview operations
- **`--guest-space-id`** — a flag that rewrites the API path. The command itself is identical between guest-space and regular cases

For the full command list, see [`skills/kt/SKILL.md`](skills/kt/SKILL.md).

### Stream large result sets as NDJSON with `--fields` and `--page-all`

```sh
kt records get --app 42 --fields "Title,Assignee,Status" --page-all > records.jsonl
```

- Outputs every record from app 42 as one JSON object per line, limited to three fields
- Filter with `jq 'select(...)'`, sample the head with `head -n 100`, or save to a file for later reuse
- Avoids loading the entire result set into the agent's context

### Inspect API request shapes offline with `--schema`

```sh
kt record add --schema | jq .operation.requestBody
```

Prints the request-body schema for `POST /k/v1/record.json`. Useful for shaping a `--json` payload before sending. Runs in environments without `KINTONE_BASE_URL` or credentials (CI, dev machines, and so on).

### Validate, then send, with `--dry-run`

```sh
# 1. Validate locally. No HTTP request is made.
kt record add --json "$(cat payload.json)" --dry-run

# 2. Drop --dry-run to send for real.
kt record add --json "$(cat payload.json)"
```

If step 1 fails, the agent reads the structured error and fixes the payload. Step 2 only runs once step 1 succeeds.

### Edit the preview, then deploy to production

```sh
# 1. Update form fields in the preview environment.
kt preview app form-fields update --app 42 --json "$(cat fields.json)"

# 2. Deploy the preview to production.
kt preview app deploy add --json '{"apps":[{"app":42}]}'
```

Step 1 changes only the preview environment; step 2 promotes the changes to production.

---

## Limitations

- **OAuth authentication** — not yet implemented (planned). For now, only API token and password authentication are available
- **Response sanitization** — not yet implemented (planned). Until `--sanitize` ships, treat kintone record values passed to an agent as untrusted input that may contain prompt injection
- **Input hardening** — schema-level checks (typos, required fields, types) are in place. String-level hardening (file paths, control characters, URL encoding) is partially implemented (full coverage planned). See [`SECURITY.md`](SECURITY.md) for details

---

## Documentation

- Japanese version: [README.ja.md](README.ja.md)
- Agent-facing specification: [`skills/kt/SKILL.md`](skills/kt/SKILL.md)
- Design principles: [`docs/spec.md`](docs/spec.md)
- Architecture decision records (ADRs): [`docs/decisions.md`](docs/decisions.md)
- For contributors: [`CONTRIBUTING.md`](CONTRIBUTING.md) / [`AGENTS.md`](AGENTS.md)
- Security policy: [`SECURITY.md`](SECURITY.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)

## License

- MIT License (see [`LICENSE`](LICENSE))
- Bundled third-party works (such as the kintone REST API Spec) are licensed under their respective terms (see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md))
