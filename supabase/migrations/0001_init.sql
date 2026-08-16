-- =============================================================================
-- KT Appliances — initial schema
--
-- Run against a Supabase project:
--   supabase db push
-- or paste into the SQL editor.
--
-- Security model:
--   * `anon` (the browser-safe key, used server-side for reads) can SELECT only
--     published, non-draft appliances and their images. Nothing else.
--   * All writes go through the service-role key from server-only code
--     (`src/lib/supabase/client.ts` is marked `server-only`), which bypasses RLS.
--   * `leads` is completely closed to `anon` — no SELECT, no INSERT. Lead inserts
--     happen server-side with the service role, so a leaked anon key cannot read
--     or forge customer contact details.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type appliance_category as enum (
    'refrigerators', 'washers', 'dryers', 'washer-dryer-sets',
    'ranges', 'dishwashers', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appliance_status as enum ('available', 'reserved', 'sold', 'draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appliance_condition as enum (
    'scratch-and-dent', 'open-box', 'new-in-box', 'refurbished'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appliance_fuel_type as enum ('electric', 'gas', 'dual-fuel', 'propane');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_inquiry_type as enum (
    'appliance', 'delivery', 'financing', 'installation', 'after-hours', 'general'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost', 'spam');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- appliances
-- ---------------------------------------------------------------------------

create table if not exists public.appliances (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  sku                   text,
  title                 text not null,
  brand                 text not null,
  model_number          text,
  category              appliance_category not null,
  subcategory           text,
  description           text,
  condition             appliance_condition not null default 'scratch-and-dent',
  cosmetic_notes        text,
  functional_notes      text,

  -- Whole US dollars. `compare_at_price` is nullable on purpose: it must stay
  -- empty unless a verified retail price for the same model exists, so the UI
  -- can never render an invented markdown.
  price                 integer not null check (price >= 0),
  compare_at_price      integer check (compare_at_price is null or compare_at_price >= 0),

  quantity              integer not null default 1 check (quantity >= 0),
  status                appliance_status not null default 'draft',

  color                 text,
  finish                text,
  dimensions            text,
  capacity              text,
  fuel_type             appliance_fuel_type,

  warranty_available     boolean not null default true,
  delivery_available     boolean not null default true,
  installation_available boolean not null default true,
  haul_away_available    boolean not null default true,

  featured              boolean not null default false,
  published             boolean not null default false,

  sold_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- A comparison price that is not actually higher is meaningless; reject it at
  -- the database rather than filtering it in the UI.
  constraint compare_price_above_price
    check (compare_at_price is null or compare_at_price > price)
);

comment on column public.appliances.compare_at_price is
  'Verified retail price for the same model. Leave NULL when no verified price exists — never estimate.';

-- Indexes sized to the queries the site actually runs.
create index if not exists appliances_public_browse_idx
  on public.appliances (status, created_at desc)
  where published = true;

create index if not exists appliances_category_idx
  on public.appliances (category, status, created_at desc)
  where published = true;

create index if not exists appliances_price_idx
  on public.appliances (price)
  where published = true;

create index if not exists appliances_brand_idx on public.appliances (brand);
create index if not exists appliances_featured_idx
  on public.appliances (featured, created_at desc)
  where published = true and featured = true;
create index if not exists appliances_sold_idx
  on public.appliances (sold_at desc)
  where status = 'sold' and published = true;
create index if not exists appliances_updated_idx on public.appliances (updated_at desc);

-- Free-text search across the fields the search box covers.
create index if not exists appliances_search_idx on public.appliances
  using gin (
    to_tsvector('english',
      coalesce(brand, '') || ' ' || coalesce(title, '') || ' ' ||
      coalesce(model_number, '') || ' ' || coalesce(subcategory, '') || ' ' ||
      coalesce(sku, '')
    )
  );

-- ---------------------------------------------------------------------------
-- appliance_images
-- ---------------------------------------------------------------------------

create table if not exists public.appliance_images (
  id           uuid primary key default gen_random_uuid(),
  appliance_id uuid not null references public.appliances (id) on delete cascade,
  image_url    text not null,
  alt_text     text,
  sort_order   integer not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists appliance_images_appliance_idx
  on public.appliance_images (appliance_id, is_primary desc, sort_order);

-- At most one primary image per appliance.
create unique index if not exists appliance_images_one_primary_idx
  on public.appliance_images (appliance_id)
  where is_primary = true;

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text not null,
  email          text,
  zip            text,

  appliance_id   uuid references public.appliances (id) on delete set null,
  -- Denormalised label so a lead stays readable after the appliance is deleted.
  appliance_label text,

  inquiry_type   lead_inquiry_type not null default 'general',
  message        text,

  source         text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,
  landing_page   text,
  referrer       text,
  form_location  text,

  status         lead_status not null default 'new',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status, created_at desc);
create index if not exists leads_appliance_idx on public.leads (appliance_id);
create index if not exists leads_campaign_idx on public.leads (utm_campaign, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists appliances_touch_updated_at on public.appliances;
create trigger appliances_touch_updated_at
  before update on public.appliances
  for each row execute function public.touch_updated_at();

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- Keep `sold_at` in step with `status` so the "recently sold" list is always
-- accurate without the application having to remember to set it.
create or replace function public.sync_sold_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sold' and (old.status is distinct from 'sold') then
    new.sold_at := coalesce(new.sold_at, now());
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists appliances_sync_sold_at on public.appliances;
create trigger appliances_sync_sold_at
  before insert or update of status on public.appliances
  for each row execute function public.sync_sold_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.appliances       enable row level security;
alter table public.appliance_images enable row level security;
alter table public.leads            enable row level security;

-- Public read: published, non-draft appliances only.
drop policy if exists "public read published appliances" on public.appliances;
create policy "public read published appliances"
  on public.appliances
  for select
  to anon, authenticated
  using (published = true and status <> 'draft');

-- Public read: images belonging to a publicly visible appliance.
drop policy if exists "public read images of published appliances" on public.appliance_images;
create policy "public read images of published appliances"
  on public.appliance_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.appliances a
      where a.id = appliance_images.appliance_id
        and a.published = true
        and a.status <> 'draft'
    )
  );

-- `leads` intentionally has RLS enabled and NO policies: with RLS on and no
-- policy, anon and authenticated roles get zero rows and zero writes. The
-- service-role key bypasses RLS, which is how the server writes leads.

-- ---------------------------------------------------------------------------
-- Storage bucket for appliance photography
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'appliance-images',
  'appliance-images',
  true,
  10485760, -- 10 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read product photos; only the service role can write them.
drop policy if exists "public read appliance images" on storage.objects;
create policy "public read appliance images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'appliance-images');
