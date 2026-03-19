---
name: ktc
description: "kintone REST API CLI. Use when operating on kintone apps, records, fields, ACLs, or files. Supports all CRUD operations, bulk data export via NDJSON streaming, and pre-live (preview) settings management."
compatibility: Requires Node.js.
metadata:
  author: latica-jp
  version: "0.1.0"
allowed-tools: Bash(npx:*) Bash(ktc:*)
---

# ktc — kintone REST API CLI

> Run commands with `npx @latica-jp/kintone-cli` (e.g. `npx @latica-jp/kintone-cli record get --app 1 --id 1`).
> All examples below use `ktc` as shorthand — replace with `npx @latica-jp/kintone-cli` if `ktc` is not on PATH.

## Authentication

Set environment variables before use:

```bash
# Required
KINTONE_BASE_URL=https://example.cybozu.com

# API Token (per-app, recommended for CI)
KINTONE_API_TOKEN=xxxxx

# Password (user context)
KINTONE_USERNAME=user
KINTONE_PASSWORD=pass

# Multiple tokens (cross-app operations)
KINTONE_API_TOKEN=token1,token2
```

If multiple auth methods are configured, a warning is shown. Use `--auth-type` to specify explicitly.

## Global Flags

| Flag | Description |
|------|-------------|
| `--auth-type <type>` | Authentication type: `api-token`, `password`, `oauth` |
| `--guest-space-id <id>` | Guest space ID (changes API path prefix) |

## Commands

### Records

| Command | Description |
|---------|-------------|
| `ktc record get --app <id> --id <id>` | Get a single record |
| `ktc record add --json '<payload>'` | Add a single record |
| `ktc record update --json '<payload>'` | Update a single record |
| `ktc records get --app <id>` | Get records (1 page, max 500) |
| `ktc records get --app <id> --page-all` | Get all records (NDJSON stream) |
| `ktc records add --json '<payload>'` | Add multiple records |
| `ktc records update --json '<payload>'` | Update multiple records |
| `ktc records delete --json '<payload>'` | Delete multiple records |

### Apps

| Command | Description |
|---------|-------------|
| `ktc app get --id <id>` | Get app info |
| `ktc apps get` | List apps |
| `ktc app form-fields get --app <id>` | Get form fields (live) |
| `ktc app form-layout get --app <id>` | Get form layout |
| `ktc app settings get --app <id>` | Get app settings |

### ACL

| Command | Description |
|---------|-------------|
| `ktc app acl get --app <id>` | Get app ACL |
| `ktc field-acl get --app <id>` | Get field ACL |
| `ktc record acl get --app <id>` | Get record ACL |

### Preview (Pre-live Settings)

| Command | Description |
|---------|-------------|
| `ktc preview app deploy add --json '<payload>'` | Deploy app settings |
| `ktc preview app deploy get --apps <ids>` | Get deploy status |
| `ktc preview app form-fields get --app <id>` | Get form fields (pre-live) |
| `ktc preview app form-fields add --json '<payload>'` | Add form fields |
| `ktc preview app form-fields update --json '<payload>'` | Update form fields |
| `ktc preview app form-fields delete --app <id> --fields <codes>` | Delete form fields |
| `ktc preview app acl get --app <id>` | Get app ACL (pre-live) |
| `ktc preview app acl update --json '<payload>'` | Update app ACL |
| `ktc preview field-acl get --app <id>` | Get field ACL (pre-live) |
| `ktc preview field-acl update --json '<payload>'` | Update field ACL |
| `ktc preview record-acl get --app <id>` | Get record ACL (pre-live) |
| `ktc preview record-acl update --json '<payload>'` | Update record ACL |

### Files

| Command | Description |
|---------|-------------|
| `ktc file get --file-key <key>` | Download a file |
| `ktc file add --file <path>` | Upload a file |

## Key Flags

| Flag | Applies to | Description |
|------|-----------|-------------|
| `--json <payload>` | Write commands | Raw kintone API request body |
| `--dry-run` | Write commands | Show request without executing |
| `--fields <codes>` | `records get` | Comma-separated field codes to return |
| `--page-all` | `records get` | Fetch all records via cursor API (NDJSON output) |
| `--total-count` | `records get` | Include total count in response |
| `--lang <lang>` | Some GET commands | Language: `default`, `en`, `zh`, `ja`, `user` |

## Rules

> [!CAUTION]
> Always use `--dry-run` before executing write or delete operations.

- Use `--fields` on `records get` to limit response size
- For bulk data, use `--page-all` and pipe through `jq` — do NOT load all records into context
- `--json` accepts the kintone API request body as-is — refer to [kintone REST API docs](https://kintone.dev/en/docs/kintone/rest-api/)
- Command structure follows kintone API paths for predictability

## Examples

```bash
# Get a record
ktc record get --app 42 --id 1

# Search records with field filtering
ktc records get --app 42 --query 'ステータス = "完了"' --fields "レコード番号,名前"

# Export all records as NDJSON, filter with jq
ktc records get --app 42 --page-all --fields "レコード番号,名前" | jq 'select(.["名前"].value | test("田中"))'

# Add a record (dry-run first)
ktc record add --dry-run --json '{"app": 42, "record": {"名前": {"value": "新規"}}}'
ktc record add --json '{"app": 42, "record": {"名前": {"value": "新規"}}}'

# Deploy app settings
ktc preview app deploy add --json '{"apps": [{"app": 42}]}'
ktc preview app deploy get --apps 42

# Get app permissions
ktc app acl get --app 42
```
