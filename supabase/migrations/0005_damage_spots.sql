-- ---------------------------------------------------------------------------
-- Damage spots: where the cosmetic damage is, on the photo.
--
-- Array of { x, y, label, imageId? } where x/y are 0–1 fractions of the
-- primary photo's own box (not the page layout), so a spot survives any
-- resize or re-crop of the rendered image. `label` is the owner's plain
-- description ("Dent, lower left door — 2 inches"); `imageId` optionally
-- points at an appliance_images row holding the close-up of that spot.
--
-- The default is an empty array, and an empty array renders NOTHING on the
-- site — no empty map, no "no damage recorded" badge. Absence of data is not
-- a claim of absence, same rule as compare_at_price's nullability.
--
-- Validation of the shape happens in the app (zod, src/lib/admin/
-- appliance-schema.ts); the column only guarantees it holds a JSON array.
-- ---------------------------------------------------------------------------

alter table public.appliances
  add column if not exists damage_spots jsonb not null default '[]'::jsonb;

alter table public.appliances
  drop constraint if exists appliances_damage_spots_is_array;

alter table public.appliances
  add constraint appliances_damage_spots_is_array
  check (jsonb_typeof(damage_spots) = 'array');
