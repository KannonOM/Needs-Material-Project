-- Normalize allowed_users.email for case-insensitive Microsoft sign-in matching.
-- Safe to re-run only once in normal migration flow (constraints/triggers are named).

-- Fail clearly if two rows would collide after lowercasing.
do $$
begin
  if exists (
    select 1
    from public.allowed_users
    group by lower(btrim(email))
    having count(*) > 1
  ) then
    raise exception
      'Migration 002 aborted: allowed_users has emails that differ only by case/whitespace. Resolve duplicates, then re-run.';
  end if;
end $$;

-- Lowercase and trim existing emails.
update public.allowed_users
set email = lower(btrim(email))
where email is distinct from lower(btrim(email));

-- Keep storing emails in normalized form.
create or replace function public.normalize_allowed_users_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

drop trigger if exists allowed_users_normalize_email on public.allowed_users;
create trigger allowed_users_normalize_email
before insert or update of email on public.allowed_users
for each row
execute function public.normalize_allowed_users_email();

-- Reject non-normalized values even if the trigger is bypassed.
alter table public.allowed_users
  drop constraint if exists allowed_users_email_normalized_check;

alter table public.allowed_users
  add constraint allowed_users_email_normalized_check
  check (email = lower(btrim(email)));

-- Case-insensitive uniqueness (preserves existing unique(email); blocks case-only dupes).
create unique index if not exists allowed_users_email_lower_uidx
  on public.allowed_users (lower(email));

comment on column public.allowed_users.email is
  'Unique Kannon email; stored trimmed + lowercase for case-insensitive Microsoft sign-in matching.';
