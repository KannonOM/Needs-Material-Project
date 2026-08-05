# Kannon Manufacturing Needs Material Dashboard

## Controlling Direction

Use the existing Sunday prototype visual language (colors, navigation chrome, typography, modals) as the styling baseline.

**Approved Version 1 dashboard behavior** (below) is the functional baseline for the Needs Material table, KPI cards, Flats/Shapes summaries, and edit workflow. Do not add unapproved features beyond this document.

## Approved Version 1 Dashboard

### Scope of rows

- Show only **active** work orders where `production_status = "Need Material"`.
- Do not show the full scheduler workbook.
- No pagination — one vertically scrollable table with a **sticky header**.
- Default sort: **Due Date ascending** (earliest first).
- Real-time search and sortable column headers.

### Table columns (in order)

1. WO  
2. Customer PO (read-only, scheduler-controlled)  
3. Customer  
4. Due Date  
5. Part Number  
6. Qty  
7. Flats (plain text summary only — no colors or icons)  
8. Shapes (plain text summary only — no colors or icons)  
9. Owner  
10. Edit  

### Flats / Shapes summary rules (one value per category)

| Condition | Display |
|---|---|
| No material lines in the category | `None` |
| Every line in the category has status `Received` | `Complete` |
| One or more lines have EAD before today and are not `Received` | `N Late` (e.g. `1 Late`) — **Late takes priority over Open** |
| Otherwise | `N Open` for lines not `Received` |

### KPI cards (click filters the visible table only; never mutates saved data)

- Open WO  
- Overdue EAD  
- Due This Week  
- Waiting on Quote  
- Late Suppliers  

KPI values are calculated from active Need Material work orders and their material lines.

### Edit modal

- Owner and Notes on the work order  
- Customer PO shown read-only  
- Separate Flats and Shapes sections with repeatable lines  
- Per line: Material Type (free text), Supplier, Material PO, EAD, Status  
- `+ Add Flats Material` / `+ Add Shapes Material`  
- Remove line with confirmation  
- Status values: Not Ordered, Quote Requested, PO Issued, Supplier Confirmed, In Transit, Partially Received, Received, Problem / Escalation  
- New lines default to **Not Ordered**

### Do not change without approval

- Overall visual style (navy/blue Sunday look)
- Navigation chrome and Administration screen structure
- User invitation workflow labels
- Terminology (Need Material, Flats, Shapes, EAD)

### Do not add in Version 1

- Pagination
- Color coding or icons in Flats/Shapes cells
- New reports, charts, navigation sections, or role types
- Supabase / Microsoft auth / SharePoint wiring in the UI prototype path (still local sample data + localStorage for UX validation)

## Goal

Make the approved Version 1 dashboard experience real and secure without redesigning the Sunday visual language.

## Live Production Source

SharePoint workbook:

- File: `Production Scheduler - 2026.xlsx`
- Site: `https://kannonmfg.sharepoint.com/sites/FortWorth`
- Folder: `Shared Documents/Production/Production Schedule`
- Worksheet: `Scheduler 2026`

Import only rows where the production status equals:

`Need Material`

## SharePoint Refresh

The application must:

1. Read the live SharePoint workbook.
2. Read the `Scheduler 2026` worksheet.
3. Import only rows where Status equals `Need Material`.
4. Refresh automatically every day at 10:00 AM America/Chicago.
5. Keep the existing Refresh Now button for Administrators and Schedulers.
6. Update scheduler-controlled fields.
7. Preserve dashboard-controlled fields.
8. Mark records inactive when they are no longer Need Material.
9. Never delete historical records.
10. Record refresh results and failures.

## Scheduler-Controlled Fields

These fields come from SharePoint and may be overwritten during refresh:

- Work Order
- Customer PO
- Customer
- Order Date
- Due Date
- ESD
- Part Number
- Description
- Quantity
- Production Status

## Dashboard-Controlled Fields

These fields are entered or updated in the dashboard and must never be overwritten by SharePoint refresh.

### On the work order (`needs_material` parent)

- Owner
- Follow-Up Notes

### On each material line (`material_lines` child)

Each work order may have zero or more material lines. Lines are grouped by category:

- Material Category: `Flats` or `Shapes`
- Material Type (manual text entry)
- Supplier
- Material PO
- EAD (expected arrival date)
- Status (per line, not on the work order header)

Allowed material-line status values:

- Not Ordered
- Quote Requested
- PO Issued
- Supplier Confirmed
- In Transit
- Partially Received
- Received
- Problem / Escalation

New material lines default to `Not Ordered`.

SharePoint refresh must never create, update, or delete material lines (including status). It only updates scheduler-controlled parent fields and lifecycle flags (`active`, `source_last_seen_at`).

## Authentication

Use real Microsoft 365 authentication.

Requirements:

- No separate dashboard passwords.
- No open public registration.
- A user must successfully authenticate with Microsoft.
- A user must also exist in the dashboard allowlist.
- Unauthorized Microsoft users must be denied.
- Do not expose client secrets in browser code.

## Administrator

Initial administrator:

- Name: Chris Vieux
- Role: Administrator

Chris must be able to:

- Invite users
- Assign roles
- Change roles
- Disable users
- Re-enable users
- Remove users
- View audit history
- Trigger a manual SharePoint refresh
- Edit all dashboard-controlled fields

## Roles

### Administrator
- Full access
- User management
- Manual refresh
- Audit log access
- Edit all dashboard-controlled fields

### Purchasing
- View dashboard
- Edit dashboard-controlled fields

### Scheduler
- View dashboard
- Edit dashboard-controlled fields
- Trigger manual SharePoint refresh

### Viewer
- Read-only access

## User Invitations

Keep the existing prototype workflow and make it functional.

The Administrator enters:

- Name
- Kannon email
- Role

The system must:

1. Add the user to the allowlist.
2. Assign the selected role.
3. Send an invitation email or provide a secure invitation link.
4. Instruct the user to sign in with Microsoft.
5. Show invitation status in the existing Administration screen.

## Data Storage

Use a secure shared database.

Recommended tables:

### `allowed_users`
- id
- email
- full_name
- role
- status
- invited_at
- accepted_at
- disabled_at
- created_by
- created_at
- updated_at

### `needs_material` (parent work order)
- id
- work_order
- customer_po
- customer
- order_date
- due_date
- esd
- part_number
- description
- quantity
- production_status
- owner
- follow_up_notes
- active
- source_last_seen_at
- created_at
- updated_at

### `material_lines` (child purchasing lines)
- id
- needs_material_id (FK → needs_material.id)
- material_category (`Flats` or `Shapes`)
- material_type
- supplier
- material_po
- ead
- status (default `Not Ordered`)
- sort_order
- created_at
- updated_at

### `audit_log`
- id
- user_id
- action
- record_type
- record_id
- field_name
- old_value
- new_value
- created_at

### `refresh_history`
- id
- refresh_type
- started_at
- completed_at
- status
- rows_read
- rows_created
- rows_updated
- rows_archived
- error_message
- triggered_by

## Security Requirements

- Use HTTPS.
- Keep all secrets in server-side environment variables.
- Never expose Supabase service-role keys in client code.
- Never expose Microsoft client secrets in client code.
- Validate authorization on every write operation.
- Protect every API route and server action.
- Log important changes.
- Do not use shared passwords.
- Do not bypass security to make development easier.
- Use least-privilege SharePoint access.

## Recommended Technology

- Next.js
- TypeScript
- Tailwind CSS
- Supabase or equivalent PostgreSQL database
- Microsoft Entra ID
- Microsoft Graph
- Vercel
- GitHub

## Development Rules

Before modifying code:

1. Read the entire project.
2. Read this file completely.
3. Inspect the Sunday prototype.
4. Compare the prototype with the production scaffold.
5. List what is simulated and what must become real.
6. Provide an implementation plan.
7. Do not modify the visible design.
8. Do not change business rules.
9. Do not remove existing working behavior.
10. Run linting, type checking, and production build checks after changes.

## First Cursor Task

Use this prompt:

> Review the entire project and this PROJECT.md file before making any changes. The Sunday prototype is the exact visual and functional baseline. Do not redesign anything. Identify every simulated component and map it to the real production service required: Microsoft authentication, SharePoint import, shared database storage, user invitations, permissions, daily 10:00 AM Central refresh, manual refresh, and audit logging. Return a file-by-file implementation plan and do not modify code yet.

## Acceptance Criteria

The first production release is complete when:

- The approved Version 1 dashboard behavior is in place (columns, KPIs, Flats/Shapes summaries, sticky scrollable table, no pagination).
- Sunday visual styling remains consistent.
- Microsoft 365 sign-in works.
- Only allowlisted users can enter.
- Chris Vieux is Administrator.
- User invitations work.
- Roles are enforced.
- The live SharePoint workbook is used.
- Only active `Need Material` rows appear on the dashboard.
- The dashboard refreshes daily at 10:00 AM America/Chicago.
- The manual Refresh Now button works.
- Purchasing edits persist for all users (owner, notes, and material lines).
- Work orders support zero or more Flats/Shapes material lines.
- SharePoint refresh never overwrites dashboard-controlled parent fields or material lines.
- Inactive records are archived, not deleted.
- Audit logging works.
- The application is deployable to Vercel.
