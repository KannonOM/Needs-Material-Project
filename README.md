# Needs Material Dashboard

**Purchasing Work Queue**

Dashboard header shows the app name, subtitle, last refresh timestamp, and informational source `Production Scheduler - 2026.xlsx`.

This repository is the runnable application baseline that preserves the Sunday prototype visual language and the approved Version 1 dashboard behavior.

## What works now

- Microsoft-style login screen (local baseline login)
- Dashboard navigation
- Search and sortable columns
- KPI summary cards
- Sticky-header Needs Material work queue table
- Flats / Shapes material lines in the edit dialog
- Supabase-backed work orders and material lines (when configured)
- Administration screen (local baseline users)
- Refresh reload from Supabase
- Printable/exportable dashboard view

## What remains for production wiring

- Local login -> Microsoft Entra ID authentication
- Sample/SharePoint seed path -> live SharePoint workbook import
- Simulated SharePoint refresh -> Microsoft Graph refresh
- Queued invitation -> real invitation email/allowlist entry

Read `PROJECT.md` before changing code. Do not redesign the approved Version 1 UI.

## Database (Supabase)

Schema lives in `supabase/migrations/001_init.sql` with an admin seed in `supabase/seed.sql`. Setup steps: [docs/supabase.md](docs/supabase.md).

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Static reference

The original browser prototype is preserved at:

`public/sunday-prototype.html`
