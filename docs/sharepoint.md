# SharePoint workbook import

Needs Material Dashboard imports live work orders from the Fort Worth production scheduler workbook through **Microsoft Graph** (server-side only).

## Workbook

| Setting | Value |
|---|---|
| Site | `https://kannonmfg.sharepoint.com/sites/FortWorth` |
| File | `Production/Production Schedule/Production Scheduler - 2026.xlsx` |
| Worksheet | `Scheduler 2026` |
| Filter | `STATUS` trimmed, case-insensitive equals `Need Material` |
| Match key | `WO` (distinct values) |

## Environment variables (server-only)

```bash
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
SHAREPOINT_HOSTNAME=kannonmfg.sharepoint.com
SHAREPOINT_SITE_PATH=/sites/FortWorth
SHAREPOINT_FILE_PATH=Production/Production Schedule/Production Scheduler - 2026.xlsx
```

Use a **separate** Entra app registration for unattended Graph access (client credentials), not the interactive Auth.js app.

### Required application permissions

Grant admin consent for:

- `Sites.Read.All` (or a more constrained Sites selected permission that can read this library)
- Excel Graph access is included when reading workbook via drive item APIs with Sites permissions

## Database migration

Apply [`supabase/migrations/003_refresh_history_diagnostics.sql`](../supabase/migrations/003_refresh_history_diagnostics.sql) in the Supabase SQL editor before relying on the new diagnostic columns.

## Manual refresh

`POST /api/refresh` (Administrator or Scheduler):

1. Authenticates to Graph with client credentials
2. Reads `Scheduler 2026` used range
3. Upserts distinct Need Material WOs into `needs_material`
4. Preserves `owner`, `follow_up_notes`, and all `material_lines`
5. Archives active rows no longer Need Material (`active = false`, never deletes)
6. Writes `refresh_history`
7. UI reloads from Supabase and updates Source / Last Refresh

## Diagnostics

Stored on `refresh_history.diagnostics` and returned by the API:

- blank WO skipped
- duplicate WO skipped
- missing worksheet
- missing expected columns
- invalid date values
- Graph permission / auth errors

## Column mapping

| Spreadsheet | Database |
|---|---|
| WO | `work_order` |
| PO # | `customer_po` |
| CUSTOMER | `customer` |
| ORDER DATE | `order_date` |
| DUE DATE | `due_date` |
| ESD | `esd` |
| PART # | `part_number` |
| DESCRIPTION | `description` |
| QTY | `quantity` |
| STATUS | `production_status` |
