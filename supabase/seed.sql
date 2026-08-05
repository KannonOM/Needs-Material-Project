-- Safe seed for Scheduler Needs Material
--
-- Before running:
-- 1. Apply supabase/migrations/001_init.sql
-- 2. Replace CHRIS_KANNON_EMAIL_REPLACE_ME with Chris Vieux's real Kannon email
--    (example: cvieux@kannonmfg.com)
-- 3. Run this file once in the Supabase SQL Editor (or via supabase db reset / seed)
--
-- This seed does not insert sample Needs Material rows. The app continues to use
-- local sample data until SharePoint import is implemented.

insert into public.allowed_users (
  email,
  full_name,
  role,
  status,
  invited_at,
  accepted_at,
  created_at,
  updated_at
)
values (
  'CHRIS_KANNON_EMAIL_REPLACE_ME',
  'Chris Vieux',
  'administrator',
  'active',
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  status = excluded.status,
  accepted_at = coalesce(public.allowed_users.accepted_at, excluded.accepted_at),
  updated_at = timezone('utc', now());
