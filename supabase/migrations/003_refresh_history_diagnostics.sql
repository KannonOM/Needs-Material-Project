-- Extend refresh_history for SharePoint import diagnostics (Phase 5).

alter table public.refresh_history
  add column if not exists rows_matching integer not null default 0;

alter table public.refresh_history
  add column if not exists distinct_work_orders integer not null default 0;

alter table public.refresh_history
  add column if not exists rows_failed integer not null default 0;

alter table public.refresh_history
  add column if not exists source_filename text;

alter table public.refresh_history
  add column if not exists diagnostics jsonb;

comment on column public.refresh_history.rows_read is
  'Spreadsheet data rows inspected (excluding header).';
comment on column public.refresh_history.rows_matching is
  'Rows whose STATUS equals Need Material (case-insensitive, trimmed).';
comment on column public.refresh_history.distinct_work_orders is
  'Distinct non-blank WO values among matching rows.';
comment on column public.refresh_history.rows_failed is
  'Rows that failed validation during import (invalid dates, etc.).';
comment on column public.refresh_history.source_filename is
  'Workbook filename returned by Microsoft Graph.';
comment on column public.refresh_history.diagnostics is
  'Structured diagnostics: blank WO, duplicate WO, missing columns, etc.';
