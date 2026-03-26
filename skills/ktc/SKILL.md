---
name: ktc
description: "kintone REST API CLI. Use when operating on kintone apps, records, fields, ACLs, spaces, plugins, or files. Supports all CRUD operations, bulk data export via NDJSON streaming, pre-live (preview) settings management, and system administration."
compatibility: Requires Node.js.
metadata:
  author: latica-jp
  version: "0.3.0"
allowed-tools: Bash(npx:*) Bash(ktc:*)
---

# ktc — kintone REST API CLI

> Run commands with `npx @latica-jp/kintone-cli` (e.g. `npx @latica-jp/kintone-cli record get --app 1 --id 1`).
> All examples below use `ktc` as shorthand — replace with `npx @latica-jp/kintone-cli` if `ktc` is not on PATH.

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
| `ktc record get --app <id> --id <id>` | Get a single record |
| `ktc record add --json '<payload>'` | Add a single record |
| `ktc record update --json '<payload>'` | Update a single record |
| `ktc records get --app <id>` | Get records (1 page, max 500) |
| `ktc records get --app <id> --page-all` | Get all records (NDJSON stream) |
| `ktc records add --json '<payload>'` | Add multiple records |
| `ktc records update --json '<payload>'` | Update multiple records |
| `ktc records delete --json '<payload>'` | Delete multiple records |

### Record Status & Assignees

| Command | Description |
|---------|-------------|
| `ktc record status update --json '<payload>'` | Update record status (process management) |
| `ktc records status update --json '<payload>'` | Update multiple record statuses |
| `ktc record assignees update --json '<payload>'` | Update record assignees |
| `ktc records acl-evaluate get --app <id> --ids <ids>` | Evaluate record ACL permissions |

### Comments

| Command | Description |
|---------|-------------|
| `ktc record comment add --json '<payload>'` | Add a comment |
| `ktc record comment delete --app <id> --record <id> --comment <id>` | Delete a comment |
| `ktc record comments get --app <id> --record <id>` | Get comments (options: `--order`, `--offset`, `--limit`) |

### Apps

| Command | Description |
|---------|-------------|
| `ktc app get --id <id>` | Get app info |
| `ktc apps get` | List apps |
| `ktc app form-fields get --app <id>` | Get form fields (live) |
| `ktc app form-layout get --app <id>` | Get form layout |
| `ktc app settings get --app <id>` | Get app settings |
| `ktc app move add --json '<payload>'` | Move app to another space |

### App Settings (Live — read only)

| Command | Description |
|---------|-------------|
| `ktc app views get --app <id>` | Get app views |
| `ktc app customize get --app <id>` | Get JS/CSS customization |
| `ktc app reports get --app <id>` | Get app reports (graphs) |
| `ktc app status get --app <id>` | Get process management settings |
| `ktc app actions get --app <id>` | Get app action settings |
| `ktc app admin-notes get --app <id>` | Get admin notes |
| `ktc app notifications-general get --app <id>` | Get general notifications |
| `ktc app notifications-per-record get --app <id>` | Get per-record notifications |
| `ktc app notifications-reminder get --app <id>` | Get reminder notifications |
| `ktc app plugins get --app <id>` | Get app plugins |

### ACL

| Command | Description |
|---------|-------------|
| `ktc app acl get --app <id>` | Get app ACL |
| `ktc field-acl get --app <id>` | Get field ACL |
| `ktc record acl get --app <id>` | Get record ACL |

### Preview (Pre-live Settings)

| Command | Description |
|---------|-------------|
| `ktc preview app add --json '<payload>'` | Create a new app |
| `ktc preview app deploy add --json '<payload>'` | Deploy app settings |
| `ktc preview app deploy get --apps <ids>` | Get deploy status |
| `ktc preview app settings get --app <id>` | Get app settings (pre-live) |
| `ktc preview app settings update --json '<payload>'` | Update app settings |
| `ktc preview app form-fields get --app <id>` | Get form fields (pre-live) |
| `ktc preview app form-fields add --json '<payload>'` | Add form fields |
| `ktc preview app form-fields update --json '<payload>'` | Update form fields |
| `ktc preview app form-fields delete --app <id> --fields <codes>` | Delete form fields |
| `ktc preview app form-layout get --app <id>` | Get form layout (pre-live) |
| `ktc preview app form-layout update --json '<payload>'` | Update form layout |
| `ktc preview app acl get --app <id>` | Get app ACL (pre-live) |
| `ktc preview app acl update --json '<payload>'` | Update app ACL |
| `ktc preview field-acl get --app <id>` | Get field ACL (pre-live) |
| `ktc preview field-acl update --json '<payload>'` | Update field ACL |
| `ktc preview record-acl get --app <id>` | Get record ACL (pre-live) |
| `ktc preview record-acl update --json '<payload>'` | Update record ACL |

### Preview App Settings (read/write)

| Command | Description |
|---------|-------------|
| `ktc preview app views get --app <id>` | Get views (pre-live) |
| `ktc preview app views update --json '<payload>'` | Update views |
| `ktc preview app customize get --app <id>` | Get JS/CSS customization (pre-live) |
| `ktc preview app customize update --json '<payload>'` | Update JS/CSS customization |
| `ktc preview app reports get --app <id>` | Get reports (pre-live) |
| `ktc preview app reports update --json '<payload>'` | Update reports |
| `ktc preview app status get --app <id>` | Get process management (pre-live) |
| `ktc preview app status update --json '<payload>'` | Update process management |
| `ktc preview app actions get --app <id>` | Get actions (pre-live) |
| `ktc preview app actions update --json '<payload>'` | Update actions |
| `ktc preview app admin-notes get --app <id>` | Get admin notes (pre-live) |
| `ktc preview app admin-notes update --json '<payload>'` | Update admin notes |
| `ktc preview app notifications-general get --app <id>` | Get general notifications (pre-live) |
| `ktc preview app notifications-general update --json '<payload>'` | Update general notifications |
| `ktc preview app notifications-per-record get --app <id>` | Get per-record notifications (pre-live) |
| `ktc preview app notifications-per-record update --json '<payload>'` | Update per-record notifications |
| `ktc preview app notifications-reminder get --app <id>` | Get reminder notifications (pre-live) |
| `ktc preview app notifications-reminder update --json '<payload>'` | Update reminder notifications |
| `ktc preview app plugins get --app <id>` | Get app plugins (pre-live) |
| `ktc preview app plugins add --json '<payload>'` | Add plugins to app |

### Spaces

| Command | Description |
|---------|-------------|
| `ktc space get --id <id>` | Get space info |
| `ktc space update --json '<payload>'` | Update space settings |
| `ktc space delete --id <id>` | Delete a space |
| `ktc space body update --json '<payload>'` | Update space body |
| `ktc space members get --id <id>` | Get space members |
| `ktc space members update --json '<payload>'` | Update space members |
| `ktc space guests update --json '<payload>'` | Update space guests |
| `ktc space thread add --json '<payload>'` | Create a thread |
| `ktc space thread update --json '<payload>'` | Update a thread |
| `ktc space thread comment add --json '<payload>'` | Add a thread comment |
| `ktc template space add --json '<payload>'` | Create space from template |

### Guest Users

| Command | Description |
|---------|-------------|
| `ktc guests add --json '<payload>'` | Add guest users |
| `ktc guests delete --guests <emails>` | Delete guest users |

### System Plugins

| Command | Description |
|---------|-------------|
| `ktc plugin add --json '<payload>'` | Install a plugin |
| `ktc plugin update --json '<payload>'` | Update a plugin |
| `ktc plugin delete --id <id>` | Uninstall a plugin |
| `ktc plugin apps get --id <id>` | Get apps using a plugin |
| `ktc plugins get` | Get installed plugins |
| `ktc plugins required get` | Get required plugins |

### Bulk Request

| Command | Description |
|---------|-------------|
| `ktc bulk-request add --json '<payload>'` | Execute multiple API requests in one call |

### Statistics

| Command | Description |
|---------|-------------|
| `ktc apps statistics get --ids <ids>` | Get app statistics |
| `ktc spaces statistics get --ids <ids>` | Get space statistics |

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
- System-level commands (`plugin`, `plugins`, `bulk-request`, `guests`, statistics) do not support `--guest-space-id`

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

# Update record status (process management)
ktc record status update --dry-run --json '{"app": 42, "id": 1, "action": "承認する"}'

# Deploy app settings
ktc preview app deploy add --json '{"apps": [{"app": 42}]}'
ktc preview app deploy get --apps 42

# Get app permissions
ktc app acl get --app 42

# Space operations
ktc space get --id 1
ktc space members get --id 1

# Bulk request
ktc bulk-request add --dry-run --json '{"requests": [{"method": "GET", "api": "/k/v1/record.json", "payload": {"app": 1, "id": 1}}]}'
```
