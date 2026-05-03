---
name: kt
description: "kintone REST API CLI. Use when operating on kintone apps, records, fields, ACLs, spaces, plugins, or files. Supports all CRUD operations, bulk data export via NDJSON streaming, pre-live (preview) settings management, and system administration."
compatibility: Requires Node.js.
metadata:
  author: yoshkosh
  version: "0.5.3"
allowed-tools: Bash(npx:*) Bash(kt:*)
---

# kt — kintone REST API CLI

> Run commands with `npx @yoshkosh/kintone-cli` (e.g. `npx @yoshkosh/kintone-cli record get --app 1 --id 1`).
> All examples below use `kt` as shorthand — replace with `npx @yoshkosh/kintone-cli` if `kt` is not on PATH.

## CRITICAL: Bash command formatting rules

Claude Code's permission checker has security heuristics that force manual approval prompts. Avoid these patterns to keep `kt` commands auto-allowed. See: <https://github.com/anthropics/claude-code/issues/34379>

1. **No `#` anywhere in the command string.** Treated as a comment delimiter even inside quotes. Don't add inline `#` comments — use the Bash tool's `description` parameter instead.
2. **No `''` (consecutive single quotes) or `""` (consecutive double quotes).** Triggers the "potential obfuscation" check. Omit empty-value flags rather than passing `''`.
   - WRONG: `kt records get --app 1 --query ''`
   - RIGHT: `kt records get --app 1`
   - `--json '{"app": 1, ...}'` is fine — the inner `"` characters aren't consecutive.
3. **Only `| jq` for filtering — no `python3` or other downstream commands.** Single-quote-only `jq` expressions are safest.
   - WRONG: `kt records get --app 1 | python3 -c "..."` (not allow-listed)
   - RIGHT: `kt records get --app 1 | jq '.records[].id'`
   - Non-ASCII field codes need `."名前"` syntax and embed `"` in the jq expression. This may still prompt once; accept it, or rename to ASCII via `--fields`.
4. **No `||` or `&&` chains.** Run sequences (e.g. `--dry-run` first, then the real call) as separate Bash tool calls.
5. **No file redirects (`>`, `>>`).** Process NDJSON / JSON output directly via `| jq`; don't write to files.

## Authentication

The following environment variables must be available at runtime. They are managed by the user's environment and are NOT the agent's responsibility.

| Variable | Required | Description |
|----------|----------|-------------|
| `KINTONE_BASE_URL` | Always | e.g. `https://example.cybozu.com` |
| `KINTONE_API_TOKEN` | Pick one | Per-app token (comma-separated for cross-app) |
| `KINTONE_USERNAME` + `KINTONE_PASSWORD` | Pick one | Password auth |

> [!CAUTION]
> Do NOT set, export, echo, or inspect these variables. They are already provided by the environment. Execute commands without commenting on authentication — if a command fails with an auth error, ask the user to check their environment configuration.

If multiple auth methods are detected, a warning is shown. Use `--auth-type` to specify explicitly.

## Global Flags

| Flag | Description |
|------|-------------|
| `--auth-type <type>` | Authentication type: `api-token`, `password`, `oauth` |
| `--guest-space-id <id>` | Guest space ID (changes API path prefix) |

## Commands

### Records

| Command | Description |
|---------|-------------|
| `kt record get --app <id> --id <id>` | Get a single record |
| `kt record add --json '<payload>'` | Add a single record |
| `kt record update --json '<payload>'` | Update a single record |
| `kt records get --app <id>` | Get records (1 page, max 500) |
| `kt records get --app <id> --page-all` | Get all records (NDJSON stream) |
| `kt records add --json '<payload>'` | Add multiple records |
| `kt records update --json '<payload>'` | Update multiple records |
| `kt records delete --json '<payload>'` | Delete multiple records |

### Record Status & Assignees

| Command | Description |
|---------|-------------|
| `kt record status update --json '<payload>'` | Update record status (process management) |
| `kt records status update --json '<payload>'` | Update multiple record statuses |
| `kt record assignees update --json '<payload>'` | Update record assignees |
| `kt records acl-evaluate get --app <id> --ids <ids>` | Evaluate record ACL permissions |

### Comments

| Command | Description |
|---------|-------------|
| `kt record comment add --json '<payload>'` | Add a comment |
| `kt record comment delete --app <id> --record <id> --comment <id>` | Delete a comment |
| `kt record comments get --app <id> --record <id>` | Get comments (options: `--order`, `--offset`, `--limit`) |

### Apps

| Command | Description |
|---------|-------------|
| `kt app get --id <id>` | Get app info |
| `kt apps get` | List apps |
| `kt app form-fields get --app <id>` | Get form fields (live) |
| `kt app form-layout get --app <id>` | Get form layout |
| `kt app settings get --app <id>` | Get app settings |
| `kt app move add --json '<payload>'` | Move app to another space |

### App Settings (Live — read only)

| Command | Description |
|---------|-------------|
| `kt app views get --app <id>` | Get app views |
| `kt app customize get --app <id>` | Get JS/CSS customization |
| `kt app reports get --app <id>` | Get app reports (graphs) |
| `kt app status get --app <id>` | Get process management settings |
| `kt app actions get --app <id>` | Get app action settings |
| `kt app admin-notes get --app <id>` | Get admin notes |
| `kt app notifications-general get --app <id>` | Get general notifications |
| `kt app notifications-per-record get --app <id>` | Get per-record notifications |
| `kt app notifications-reminder get --app <id>` | Get reminder notifications |
| `kt app plugins get --app <id>` | Get app plugins |

### ACL

| Command | Description |
|---------|-------------|
| `kt app acl get --app <id>` | Get app ACL |
| `kt field-acl get --app <id>` | Get field ACL |
| `kt record acl get --app <id>` | Get record ACL |

### Preview (Pre-live Settings)

| Command | Description |
|---------|-------------|
| `kt preview app add --json '<payload>'` | Create a new app |
| `kt preview app deploy add --json '<payload>'` | Deploy app settings |
| `kt preview app deploy get --apps <ids>` | Get deploy status |
| `kt preview app settings get --app <id>` | Get app settings (pre-live) |
| `kt preview app settings update --json '<payload>'` | Update app settings |
| `kt preview app form-fields get --app <id>` | Get form fields (pre-live) |
| `kt preview app form-fields add --json '<payload>'` | Add form fields |
| `kt preview app form-fields update --json '<payload>'` | Update form fields |
| `kt preview app form-fields delete --app <id> --fields <codes>` | Delete form fields |
| `kt preview app form-layout get --app <id>` | Get form layout (pre-live) |
| `kt preview app form-layout update --json '<payload>'` | Update form layout |
| `kt preview app acl get --app <id>` | Get app ACL (pre-live) |
| `kt preview app acl update --json '<payload>'` | Update app ACL |
| `kt preview field-acl get --app <id>` | Get field ACL (pre-live) |
| `kt preview field-acl update --json '<payload>'` | Update field ACL |
| `kt preview record-acl get --app <id>` | Get record ACL (pre-live) |
| `kt preview record-acl update --json '<payload>'` | Update record ACL |

### Preview App Settings (read/write)

| Command | Description |
|---------|-------------|
| `kt preview app views get --app <id>` | Get views (pre-live) |
| `kt preview app views update --json '<payload>'` | Update views |
| `kt preview app customize get --app <id>` | Get JS/CSS customization (pre-live) |
| `kt preview app customize update --json '<payload>'` | Update JS/CSS customization |
| `kt preview app reports get --app <id>` | Get reports (pre-live) |
| `kt preview app reports update --json '<payload>'` | Update reports |
| `kt preview app status get --app <id>` | Get process management (pre-live) |
| `kt preview app status update --json '<payload>'` | Update process management |
| `kt preview app actions get --app <id>` | Get actions (pre-live) |
| `kt preview app actions update --json '<payload>'` | Update actions |
| `kt preview app admin-notes get --app <id>` | Get admin notes (pre-live) |
| `kt preview app admin-notes update --json '<payload>'` | Update admin notes |
| `kt preview app notifications-general get --app <id>` | Get general notifications (pre-live) |
| `kt preview app notifications-general update --json '<payload>'` | Update general notifications |
| `kt preview app notifications-per-record get --app <id>` | Get per-record notifications (pre-live) |
| `kt preview app notifications-per-record update --json '<payload>'` | Update per-record notifications |
| `kt preview app notifications-reminder get --app <id>` | Get reminder notifications (pre-live) |
| `kt preview app notifications-reminder update --json '<payload>'` | Update reminder notifications |
| `kt preview app plugins get --app <id>` | Get app plugins (pre-live) |
| `kt preview app plugins add --json '<payload>'` | Add plugins to app |

### Spaces

| Command | Description |
|---------|-------------|
| `kt space get --id <id>` | Get space info |
| `kt space update --json '<payload>'` | Update space settings |
| `kt space delete --id <id>` | Delete a space |
| `kt space body update --json '<payload>'` | Update space body |
| `kt space members get --id <id>` | Get space members |
| `kt space members update --json '<payload>'` | Update space members |
| `kt space guests update --json '<payload>'` | Update space guests |
| `kt space thread add --json '<payload>'` | Create a thread |
| `kt space thread update --json '<payload>'` | Update a thread |
| `kt space thread comment add --json '<payload>'` | Add a thread comment |
| `kt template space add --json '<payload>'` | Create space from template |

### Guest Users

| Command | Description |
|---------|-------------|
| `kt guests add --json '<payload>'` | Add guest users |
| `kt guests delete --guests <emails>` | Delete guest users |

### System Plugins

| Command | Description |
|---------|-------------|
| `kt plugin add --json '<payload>'` | Install a plugin |
| `kt plugin update --json '<payload>'` | Update a plugin |
| `kt plugin delete --id <id>` | Uninstall a plugin |
| `kt plugin apps get --id <id>` | Get apps using a plugin |
| `kt plugins get` | Get installed plugins |
| `kt plugins required get` | Get required plugins |

### Bulk Request

| Command | Description |
|---------|-------------|
| `kt bulk-request add --json '<payload>'` | Execute multiple API requests in one call |

### Statistics

| Command | Description |
|---------|-------------|
| `kt apps statistics get --ids <ids>` | Get app statistics |
| `kt spaces statistics get --ids <ids>` | Get space statistics |

### Files

| Command | Description |
|---------|-------------|
| `kt file get --file-key <key>` | Download a file |
| `kt file add --file <path>` | Upload a file |

## Key Flags

| Flag | Applies to | Description |
|------|-----------|-------------|
| `--json <payload>` | Write commands | Raw kintone API request body |
| `--dry-run` | Write commands | Show request without executing |
| `--fields <codes>` | `records get` | Comma-separated field codes to return |
| `--page-all` | `records get` | Fetch all records via cursor API (NDJSON output) |
| `--total-count` | `records get` | Include total count in response |
| `--lang <lang>` | Some GET commands | Language: `default`, `en`, `zh`, `ja`, `user` |
| `--schema` | All endpoint commands | Print the OpenAPI Spec for this endpoint as JSON. No API call, no auth required, required options skipped. |
| `--skip-validation` | All `--json` commands | Bypass OpenAPI request body validation. Last-resort escape hatch (see "Payload validation" below). |

## Payload validation

Every `--json` payload is validated against the kintone OpenAPI Spec **before** the API is called. Missing required properties, type mismatches that can't be coerced, and extra top-level keys (typos like `rcord` vs `record`) are rejected with a JSON error on stderr and `exit 1`. The check runs even with `--dry-run`.

```bash
$ kt record add --json '{}'
{"error":"json_validation_failed","method":"POST","path":"/k/v1/record.json","errors":[{"instancePath":"","keyword":"required","message":"must have required property 'app'","params":{"missingProperty":"app"}}]}
$ echo $?
1
```

The `params` field carries actionable hints:

- `params.missingProperty` — name of the absent required key
- `params.additionalProperty` — name of the offending typo (e.g. `"rcord"`)

`record.<field code>` payloads are NOT inspected (kintone allows arbitrary user-defined field codes there); only top-level keys are tightened.

### `bulk-request add` (per-sub-payload validation)

Inside `bulk-request add --json`, **each `requests[i].payload` is validated against the sub-schema chosen by `(method, api)`**, not just the outer `anyOf`. This catches typos and wrong-shape mixups (e.g. sending a `record add` payload with `method: "DELETE"`):

```bash
$ kt bulk-request add --json '{"requests":[{"method":"POST","api":"/k/v1/record.json","payload":{"rcord":{}}}]}'
{"error":"json_validation_failed","method":"POST","path":"/k/v1/bulkRequest.json","errors":[
  {"instancePath":"/requests/0/payload","keyword":"required","message":"must have required property 'app'","params":{"missingProperty":"app"}},
  {"instancePath":"/requests/0/payload","keyword":"additionalProperties","message":"must NOT have additional properties","params":{"additionalProperty":"rcord"}}
]}
```

Additional rules specific to `bulk-request add`:

- The `(method, api)` pair must match one of the 8 supported sub-APIs (record/records POST/PUT/DELETE, record/records status PUT, record assignees PUT). An unknown pair is rejected with `keyword: "bulkRequestUnknownSubapi"` (`params.method` / `params.api` carry the offending values).
- `method` must be upper-case (`POST` / `PUT` / `DELETE`). Lower-case `method: "post"` is rejected as `bulkRequestUnknownSubapi`.
- Each `requests[i]` entry must contain only `{method, api, payload}`. Extra keys (e.g. `comment`) are rejected at `/requests/i` with `additionalProperties`.

### `--skip-validation` (last resort)

Use only when the spec is wrong (out-of-date, over-strict) and the kintone API would actually accept the payload. A notice is printed to stderr each time, so the flag is easy to spot in logs. If you find yourself reaching for it repeatedly, file an issue against the spec rather than continuing to bypass.

```bash
kt record add --json '{"app":1,"experimental_field":"x","record":{}}' --skip-validation
```

## Schema self-inspection

Append `--schema` to any endpoint command to print the OpenAPI Spec entry for that endpoint (`{ method, path, operation }`) as compact JSON. Useful when you need to know the exact `parameters` / `requestBody` shape before constructing `--json`. With `--schema`:

- No API call is made — works without a valid `KINTONE_BASE_URL` or auth.
- Required options can be omitted (`kt record add --schema` works without `--json`).
- `noGuestSpace` guards are bypassed (`kt plugins get --schema --guest-space-id 5` works).
- `--guest-space-id` is ignored — the non-guest path is returned, since guest paths share the same operation in the spec.
- If combined with `--dry-run`, only the schema is printed.

```bash
# Inspect the request body shape for record add
kt record add --schema | jq .operation.requestBody

# List the query parameters for records get
kt records get --schema | jq '.operation.parameters[] | select(.in == "query") | .name'
```

## Rules

> [!CAUTION]
> Always use `--dry-run` before executing write or delete operations.

- Use `--fields` on `records get` to limit response size
- For bulk data, use `--page-all` and pipe through `jq` — do NOT load all records into context
- `--json` accepts the kintone API request body as-is — refer to [kintone REST API docs](https://kintone.dev/en/docs/kintone/rest-api/)
- Command structure follows kintone API paths for predictability
- System-level commands (`plugin`, `plugins`, `bulk-request`, `guests`, statistics) do not support `--guest-space-id`

## Examples

```bash
# Get a record
kt record get --app 42 --id 1

# Search records with field filtering
kt records get --app 42 --query 'ステータス = "完了"' --fields "レコード番号,名前"

# Export all records as NDJSON, filter with jq
kt records get --app 42 --page-all --fields "レコード番号,名前" | jq 'select(.["名前"].value | test("田中"))'

# Add a record (dry-run first)
kt record add --dry-run --json '{"app": 42, "record": {"名前": {"value": "新規"}}}'
kt record add --json '{"app": 42, "record": {"名前": {"value": "新規"}}}'

# Update record status (process management)
kt record status update --dry-run --json '{"app": 42, "id": 1, "action": "承認する"}'

# Deploy app settings
kt preview app deploy add --json '{"apps": [{"app": 42}]}'
kt preview app deploy get --apps 42

# Get app permissions
kt app acl get --app 42

# Space operations
kt space get --id 1
kt space members get --id 1

# Bulk request
kt bulk-request add --dry-run --json '{"requests": [{"method": "GET", "api": "/k/v1/record.json", "payload": {"app": 1, "id": 1}}]}'
```
