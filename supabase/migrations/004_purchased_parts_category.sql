-- Add Purchased Parts as a third material_lines category.
-- Extends the existing Flats/Shapes child-line model (no new table).
-- Does not modify or migrate existing Flats/Shapes rows.

alter table public.material_lines
  drop constraint if exists material_lines_category_check;

alter table public.material_lines
  add constraint material_lines_category_check check (
    material_category in ('Flats', 'Shapes', 'Purchased Parts')
  );

comment on column public.material_lines.material_category is
  'Flats, Shapes, or Purchased Parts.';

comment on table public.material_lines is
  'Child material purchasing lines for a Need Material work order (Flats, Shapes, Purchased Parts). Dashboard-controlled; never overwritten by SharePoint refresh.';
