-- Track last successful Microsoft sign-in for Administration display.
-- Does not change status/role constraints or existing invite/active/inactive behavior.

alter table public.allowed_users
  add column if not exists last_sign_in_at timestamptz;

comment on column public.allowed_users.last_sign_in_at is
  'Most recent successful Microsoft sign-in that passed the allowlist check.';

create index if not exists allowed_users_last_sign_in_at_idx
  on public.allowed_users (last_sign_in_at desc nulls last);
