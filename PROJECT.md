# Kannon Manufacturing Needs Material Dashboard

## Controlling Direction

Use the existing Sunday prototype as the exact visual and functional baseline.

The first production release must make the prototype real without redesigning it.

## Do Not Change

Do not change any of the following unless Chris Vieux explicitly approves it after real-world testing:

- Page layout
- Navigation
- Colors
- Summary cards
- Charts
- Table layout
- Existing columns
- Filters
- Search behavior
- Administrator screen
- User invitation workflow
- Existing edit workflow
- Labels
- Terminology
- Overall visual style

## Do Not Add

Do not add any of the following in the first production release:

- New reports
- New charts
- New navigation sections
- Slide-out panels
- New dashboard cards
- New workflows
- Unrequested visual enhancements
- New columns
- New role types

## Goal

Replace only the simulated systems behind the existing prototype.

The visible interface should remain the same while the application becomes functional and secure.

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

These fields are entered or updated in the dashboard and must never be overwritten by SharePoint refresh:

- Material Needed
- Supplier
- Material PO
- Expected Arrival
- Material Status
- Owner
- Follow-Up Notes

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

### `needs_material`
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
- material_needed
- supplier
- material_po
- expected_arrival
- material_status
- owner
- follow_up_notes
- active
- source_last_seen_at
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

- It looks the same as the Sunday prototype.
- Microsoft 365 sign-in works.
- Only allowlisted users can enter.
- Chris Vieux is Administrator.
- User invitations work.
- Roles are enforced.
- The live SharePoint workbook is used.
- Only `Need Material` rows are active.
- The dashboard refreshes daily at 10:00 AM America/Chicago.
- The manual Refresh Now button works.
- Purchasing edits persist for all users.
- SharePoint refresh never overwrites dashboard-controlled fields.
- Inactive records are archived, not deleted.
- Audit logging works.
- The application is deployable to Vercel.
