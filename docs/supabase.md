# Supabase setup — Scheduler Needs Material

This project uses Supabase (PostgreSQL) for shared storage. The Sunday prototype UI still runs on local sample data and localStorage. Database work in Phase 3 only prepares the schema.

## Required environment variables

Copy `.env.example` to `.env.local` and fill in later (do not commit secrets):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL from Supabase → Settings → API |
| `SUPABASE_SECRET_KEY` | Service role / secret key (server-only; never expose to the browser) |

Optional for a future client-safe read path (not used yet):

| Variable | Purpose |
|---|---|
| `SUPABASE_ANON_KEY` | Public anon key — currently has no table access because RLS has no public policies |

## Create a Supabase project

1. Sign in at [https://supabase.com](https://supabase.com).
2. Create a new project (choose a strong database password; store it in a password manager).
3. Wait until the project is ready.
4. Open **Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` / secret key → `SUPABASE_SECRET_KEY`
5. Put those values only in `.env.local` on the server / Vercel env. Never put the secret key in client code.

## Run the migration

1. Open the Supabase Dashboard → **SQL → New query**.
2. Paste the full contents of [`supabase/migrations/001_init.sql`](../supabase/migrations/001_init.sql).
3. Run the query.
4. Confirm success with no errors.

If you use the Supabase CLI locally:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

(or apply `001_init.sql` with your preferred migration workflow)

## Replace the administrator email placeholder

1. Open [`supabase/seed.sql`](../supabase/seed.sql).
2. Replace every occurrence of `CHRIS_KANNON_EMAIL_REPLACE_ME` with Chris Vieux’s real Kannon Microsoft email.
3. Do not leave the placeholder in a production database.

## Run the seed

1. Open Supabase Dashboard → **SQL → New query**.
2. Paste the updated `supabase/seed.sql`.
3. Run the query.
4. Expected result: one row for Chris Vieux with role `administrator` and status `active`.

## Verify tables

In the SQL Editor, run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'allowed_users',
    'needs_material',
    'material_lines',
    'audit_log',
    'refresh_history'
  )
order by table_name;
```

You should see all five tables.

Check the administrator seed:

```sql
select email, full_name, role, status
from public.allowed_users
where role = 'administrator';
```

Check RLS is enabled and forced:

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in (
  'allowed_users',
  'needs_material',
  'material_lines',
  'audit_log',
  'refresh_history'
);
```

Both `relrowsecurity` and `relforcerowsecurity` should be `true`.

Optional structure checks:

```sql
-- work_order uniqueness
select indexname, indexdef
from pg_indexes
where tablename = 'needs_material';

-- role / status constraints
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.allowed_users'::regclass
  and contype = 'c';
```

## Row Level Security notes

- RLS is **enabled and forced** on all four tables.
- **No policies** grant `anon` or `authenticated` access.
- Privileges for `anon` and `authenticated` on these tables are revoked.
- Until Microsoft Entra authentication is implemented, the Next.js server should use `SUPABASE_SECRET_KEY` (service role), which bypasses RLS.
- Policies that map Entra users to `allowed_users` and enforce roles cannot be finalized until Phase 4 (auth). Those will be added in a later migration.

## What this phase does not do

- Does not change the Sunday prototype UI
- Does not wire the Next.js app to Supabase yet
- Does not replace sample data or localStorage
- Does not implement Microsoft auth or SharePoint import
