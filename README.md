# Needs Material Dashboard

**Purchasing Work Queue**

Dashboard header shows the app name, subtitle, last refresh timestamp, and informational source `Production Scheduler - 2026.xlsx`.

This repository is the runnable application baseline that preserves the Sunday prototype visual language and the approved Version 1 dashboard behavior.

## What works now

- Microsoft Entra ID (Microsoft 365) sign-in via Auth.js
- Allowlist gate against `public.allowed_users` (`status = active` only)
- Role-based access: administrator, purchasing, scheduler, viewer
- Dashboard navigation
- Search and sortable columns
- KPI summary cards
- Sticky-header Needs Material work queue table
- Flats / Shapes material lines in the edit dialog
- Supabase-backed work orders and material lines (when configured)
- Administration screen (Supabase allowlist; invite email delivery later)
- Refresh Now for administrator / scheduler (Microsoft Graph SharePoint import)
- Dynamic Source filename from the live workbook
- Printable/exportable dashboard view

## What remains for production wiring

- Daily 10:00 AM America/Chicago scheduled refresh
- Invitation email delivery (allowlist insert already works)

Read `PROJECT.md` before changing code. Do not redesign the approved Version 1 UI.

## Authentication

Setup guide: [docs/microsoft-entra.md](docs/microsoft-entra.md)

Required local redirect URI:

`http://localhost:3000/api/auth/callback/microsoft-entra-id`

## Database (Supabase)

Schema lives in `supabase/migrations/` with an admin seed in `supabase/seed.sql`. Setup steps: [docs/supabase.md](docs/supabase.md).

SharePoint import setup: [docs/sharepoint.md](docs/sharepoint.md).

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Static reference

The original browser prototype is preserved at:

`public/sunday-prototype.html`
