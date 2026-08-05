# Kannon Needs Material Dashboard

This repository is the runnable application baseline that exactly preserves the Sunday prototype UI.

## What works now

- Microsoft-style login screen (local baseline login)
- Dashboard navigation
- Search and filters
- Summary cards
- Due-date and risk charts
- 21 sample Needs Material records from the uploaded workbook
- Editable purchasing fields
- Browser persistence through localStorage
- Administration screen
- User invitation, disable, enable, and remove actions
- Refresh simulation
- Printable/exportable dashboard view

## What Cursor should replace without redesigning

- Local login -> Microsoft Entra ID authentication
- Sample rows -> live SharePoint workbook import
- localStorage -> shared database
- simulated refresh -> Microsoft Graph refresh
- queued invitation -> real invitation email/allowlist entry

Read `PROJECT.md` before changing code. The visible UI is the exact baseline and must not be redesigned.

## Database (Supabase)

Phase 3 schema lives in `supabase/migrations/001_init.sql` with a safe admin seed in `supabase/seed.sql`. Setup steps: [docs/supabase.md](docs/supabase.md). The app UI still uses local sample data until later phases.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Static reference

The exact original browser prototype is preserved at:

`public/sunday-prototype.html`
