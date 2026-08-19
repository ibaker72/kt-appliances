# KT Appliances

Website and inventory platform for KT Appliances — a scratch & dent appliance warehouse at
109 Burson St, East Stroudsburg, PA, serving Pennsylvania, New Jersey and New York.

Built as a real retail/inventory application rather than a brochure site: appliances are
database records with photos, condition disclosure and stock state; every inquiry is a
tracked lead with campaign attribution; and the store owner manages the whole thing from a
phone in the warehouse.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4, brand tokens in `src/app/globals.css` |
| Type | Archivo (display) + Inter (body), via `next/font` |
| Icons | lucide-react |
| Database & storage | Supabase (Postgres + Storage), optional |
| Validation | Zod |
| Email | Resend, optional |
| SMS | Twilio REST API over `fetch`, no SDK — gated off until A2P approval |
| Tests | `node --test` with Node's built-in TypeScript support, no framework |

---

## Getting started

```bash
npm install
cp .env.example .env.local   # nothing is required to boot
npm run dev
```

The site runs with **no environment variables at all**. Without Supabase it serves the
sample catalogue in `src/lib/inventory/demo-data.ts`, and a yellow banner across the top
makes clear that the inventory is not real. Production builds never serve sample data
unless `NEXT_PUBLIC_ENABLE_DEMO_INVENTORY=true` is set explicitly.

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # node:test — never sends a real SMS, see tests/register.mjs
```

---

## Connecting the database

1. Create a Supabase project.
2. Run **every** file in `supabase/migrations/` in order (SQL editor, or `supabase db push`):
   - `0001_init.sql` — `appliances`, `appliance_images` and `leads`, their indexes and
     triggers, the RLS policies, and the `appliance-images` storage bucket.
   - `0002_api_role_grants.sql` — explicit table grants. Without it Postgres answers
     "permission denied for table appliances".
   - `0003_appointments.sql` — `appointments` and `appointment_notifications`, plus the
     `claim_appointment_notification()` function that makes the SMS automation idempotent.
   - `0004_seo_url_submissions.sql` — the IndexNow submission ledger, so the search-
     discovery cron cannot resubmit the same URLs on every run.
   - `0005_damage_spots.sql` — `appliances.damage_spots`, the recorded damage locations
     shown on the product photo.
   - `0006_lead_click_id_and_hardening.sql` — `leads.click_id` (the `gclid`/`fbclid` that
     Google Ads offline conversion import is keyed on), a pinned `search_path` on every
     trigger function, and `rls_auto_enable()` taken off the public RPC surface.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY`.
4. Restart. Sample data switches off automatically and the admin area comes to life.

### Security model

- The **anon key** can read published, non-draft appliances and their images. That is all.
- `leads`, `appointments` and `appointment_notifications` have RLS enabled with **no
  policies**, so the anon key can neither read nor write them. A leaked public key cannot
  expose customer contact details, phone numbers or SMS consent records.
- All writes — inventory, images, leads — go through the **service-role key** from modules
  marked `server-only`, so importing them into a client component is a build error rather
  than a leak.

---

## Admin

`/admin` — inventory dashboard, appliance editor with photo upload, and the lead inbox.

Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (16+ chars) to enable sign-in. With either
missing the admin area **fails closed**: nobody can sign in and the login page explains what
to configure.

Authorization is enforced in two independent places — `src/proxy.ts` (Next 16's rename of
`middleware.ts`) rejects unauthenticated requests at the edge, and `requireAdmin()` runs
again inside every admin page and server action, because a server action is a callable
endpoint whether or not anyone navigated to its page.

### Running the inventory

The day-to-day workflow is written for the store owner, not for a developer, in
[`docs/INVENTORY-GUIDE.md`](docs/INVENTORY-GUIDE.md). In short:

```
/admin/login                  sign in with ADMIN_PASSWORD
/admin/inventory              the floor: search, filter, quick actions
/admin/inventory/new          brand, category, name, price, condition -> Create
/admin/inventory/[id]         photos first, then the rest of the detail
                              Mark sold | Archive | Duplicate | Delete
/admin/leads                  every enquiry, with the appliance it was about
/admin/appointments           bookings from /schedule
```

Publishing is not a deploy. An appliance saved with **Published** ticked and a status of
*available* is on the website within the revalidation window (two minutes for a product
page, five for the homepage) — `revalidatePath` is called on every admin mutation.

Three states, deliberately distinct:

| Action | URL | Photos | Visible | Reversible |
| --- | --- | --- | --- | --- |
| **Mark sold** | kept, shows SOLD | kept | yes, cross-selling | yes |
| **Archive** (unpublish) | kept, 404s | kept | no | yes |
| **Delete** | gone | **deleted from storage** | no | **no** |

Slugs never change on their own. Editing a title or a price leaves the web address alone,
so links already in Facebook posts, texts and Google keep working; only a slug the owner
deliberately types will move a listing, and it is de-duplicated before it is saved.

### Photo uploads

Photos are downscaled in the browser before they upload (long edge 2000px, JPEG) — a
phone camera produces 4–12 MB files and eight of those over warehouse wifi is the
difference between a listing that goes up and one that gets abandoned. Anything the
browser cannot decode uploads untouched. Files land at
`appliance-images/{appliance-id}/{timestamp}-{random}.jpg`, and deleting an appliance
removes its objects from the bucket.

---

## Project layout

```
src/
  app/
    (site)/                  public site — shares header, footer, mobile action bar
      page.tsx               homepage
      inventory/             (listing)/ + [slug] product pages, compare, saved
      refrigerators/ …       one thin route per category
      schedule/              appointment booking
      deals/[campaign]/      paid-traffic landing pages
      appliances/[location]/ service-area pages
      guides/                buying guides
    admin/                   admin shell, actions, inventory + leads + appointments
    api/cron/                scheduled SEO health check + search-discovery jobs
    actions/leads.ts         public lead submission
    actions/appointments.ts  public appointment booking
    sitemap.ts, robots.ts, llms.txt/, indexnow-key.txt/, opengraph-image.tsx
  components/
    inventory/ home/ shared/ layout/ forms/ admin/ ui/
  lib/
    site-config.ts           single source of truth for business details
    inventory/               types, query shapes, repository, sample data
    admin/                   auth, session, admin repositories, form schemas
    leads/                   schema, persistence, email
    appointments/            schema, time zones, message copy, notifications
    sms/                     Twilio transport, config gating, phone helpers
    analytics/               events, tracking, UTM attribution
    seo/                     metadata + canonical policy, JSON-LD, route registry,
                             sitemap builder, location quality gate, cron auth,
                             health check, IndexNow, submission ledger
    content/                 FAQ bank, locations, campaigns, guides
supabase/migrations/         database schema
```

Business details live in **one place** — `src/lib/site-config.ts`. Phone number, address,
hours and service area are never hardcoded anywhere else.

---

## Appointments and SMS

`/schedule` books an appointment. On a successful booking the customer gets a confirmation
text and the owner gets an alert — both through Twilio, both gated.

```
booking form  →  submitAppointment (honeypot, rate limit, Zod)
              →  persistAppointment          ← the appointment now exists
              →  sendAppointmentBookedNotifications
                   ├─ customer confirmation  (only with consent)
                   └─ owner alert            (internal, consent does not apply)
              →  appointment_notifications   ← SID, status, error, timing
```

Nothing is texted before the row is committed, and nothing that happens after it can fail
the booking. A Twilio outage, a missing owner number or a withheld consent all end with the
customer seeing a confirmed appointment.

### The A2P gate

Outbound SMS is off. `SMS_SENDING_ENABLED=false` skips every message, customer and internal,
and logs why. **After the A2P 10DLC campaign is approved, setting `SMS_SENDING_ENABLED=true`
is the only change required** — no code, no redeploy-only-for-a-constant, because the flag is
read per request rather than frozen into the bundle at import.

`SMS_CUSTOMER_SENDING_ENABLED=false` is an optional narrower valve that keeps customer-facing
traffic off while internal alerts flow. Leave it unset unless you need exactly that.

`/admin/appointments` shows the current state in plain language: whether customer
confirmations are sending, and which number owner alerts go to.

### Consent

The booking form carries an **unchecked** SMS consent box. Consent is never required to book,
and is never inferred from someone typing a phone number. When it is given, the appointment
stores the timestamp, the source (`appointment_web_form`) and the exact disclosure text that
was on screen — carriers ask what the customer agreed to, not whether a boolean was true.

The lead forms carry no consent field, so `dispatchLeadSms` deliberately sends nothing even
once the flag is on. See `src/lib/leads/sms.ts`.

### Not sending the same text twice

Every message claims a row in `appointment_notifications` before it is sent, via a single
atomic statement (`claim_appointment_notification`). A unique index on
`(appointment_id, event_type)` is what enforces it — not application memory, which two
serverless instances do not share. Double-clicks, refreshed POSTs and retried actions all
converge on one message. The booking itself is deduplicated the same way, by a unique
`submission_token` minted when the form mounts.

### Adding reminders later

The message copy for 24-hour and 2-hour reminders, reschedules, cancellations and follow-ups
already exists in `src/lib/appointments/messages.ts`, and
`sendAppointmentNotification(event, appointment)` is generic over all of them. What is missing
is only a scheduler — this project has none today. On Vercel, a `vercel.json` cron hitting an
authenticated route handler is the natural fit. The claim makes an overlapping schedule safe:
a cron that fires twice sends once.

---

## Content rules this codebase enforces

These are implemented in code, not just documented, because the site is advertised heavily
and misleading claims are a real liability:

- **No invented comparison prices.** `savingsFor()` returns `null` unless a verified
  `compare_at_price` exists and is genuinely higher, and the database rejects the row
  otherwise. Most listings show only the KT price.
- **No manufactured scarcity.** "1 Available" renders only when inventory data says so.
  There are no countdown timers and no viewer counts.
- **No fabricated social proof.** There are no testimonials, review counts, customer totals
  or award badges. The "Recently sold" section is generated from real `status = 'sold'`
  records and hides itself when there is no sales history.
- **Warranty language stays accurate.** The business states "1-year warranty available", so
  the site says *available on qualifying appliances* — never "included with every
  appliance".
- **Financing names no provider.** No APR, no terms, no "guaranteed approval", no "no
  credit check". The page explains that options exist and routes the question to a person.
- **Sold products do not 404.** They keep their URL, show a SOLD state, and cross-sell
  available stock — so ad and social links stay alive and search equity is retained.
- **No thin location pages.** A service-area record that does not clear the content bar in
  `src/lib/seo/location-quality.ts` renders `noindex` and is left out of the sitemap, the
  hub page and the schema. A page copied from a neighbouring town with the name swapped is
  rejected by a copy-overlap check, with a cloned page as the test fixture.
- **No fake freshness.** Sitemap `lastmod` comes from real timestamps — product
  `updated_at`, guide and location review dates — never from `new Date()`. A test fails if
  any entry claims to have changed in the last minute.
- **No answers that bury the answer.** A yes/no FAQ question must be answered in the first
  word, and no answer may open with marketing throat-clearing or promise something the
  business has not committed to. Asserted in `tests/seo-content.test.ts`.

---

## Product photography

Listings without an uploaded photo fall back to a category illustration in
`public/img/appliances/`. These are deliberate vector placeholders, not stock photos, sized
4:3 to match real uploads so replacing one never shifts the layout. **Real photographs of
each unit — including its damage — are the highest-value improvement available to this
site.** Upload them at `/admin`.

---

## Deployment

Any Node host; Vercel is the straightforward option.

1. Set the environment variables from `.env.example`.
2. Set `NEXT_PUBLIC_SITE_URL` to `https://kt-appliances.com`. Until it is set, `robots.txt`
   disallows all crawling so a preview cannot be indexed ahead of launch.
3. Set `CRON_SECRET`. The scheduled routes in `vercel.json` fail closed without it — they
   answer 503 rather than running unauthenticated.
4. Run every migration in `supabase/migrations/` against the production project.
5. Submit `/sitemap.xml` in Search Console.

**Organic search, structured data, the location engine and the cron jobs are documented in
[`docs/seo-aeo-geo.md`](docs/seo-aeo-geo.md).** Adding a service area has its own checklist
in [`docs/local-seo-locations.md`](docs/local-seo-locations.md) — read it before adding a
town, because half of the bar is confirming delivery with the warehouse rather than writing
copy.

**Everything that has to happen outside the codebase before launch is in
[`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md)**, marked against the real state of
the repository and the Supabase project.

### Running Supabase locally

`supabase start` serves the stack on `http://127.0.0.1:54321`. The image config derives its
`remotePattern` — protocol, host **and port** — from `NEXT_PUBLIC_SUPABASE_URL`, so product
photos load from a local stack without editing `next.config.ts`. Next 16 additionally
refuses to fetch images from a loopback address unless `images.dangerouslyAllowLocalIP` is
set; that stays out of this config on purpose, so expect `next/image` to 400 on local
storage objects and treat it as a local-only limitation rather than a bug.

---

## A note on forms

Both the customer enquiry forms and the admin appliance form echo the submitted values
back on a validation failure, and repopulate from them.

That is not decoration. React resets an uncontrolled form once a form action completes, so
without it a customer who mistypes one digit of their phone number loses their name, ZIP,
email and message with it — and the owner loses twenty fields including the condition
notes. If you add a form, echo the values back the same way.

Checkbox fields have a related trap worth knowing: an unchecked box is not submitted as
`"false"`, it is not submitted at all. A Zod schema that merely *accepts* `undefined`
without being `.optional()` rejects the missing key. `src/lib/admin/appliance-schema.ts`
documents the shape that works.
