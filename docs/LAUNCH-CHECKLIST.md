# KT Appliances — launch checklist

Everything that cannot be done from code. Items are marked from the actual state of the
repository and the linked Supabase project as of the launch-readiness audit — nothing is
ticked that was not verified.

| Mark | Meaning |
| --- | --- |
| `[x]` | Done and verified |
| `[ ]` | **Manual action required** — a person has to do this |
| `[~]` | Implemented in code, waiting on a credential or an external account before it can be proven |

---

## 1 · Blocking — the site should not be advertised until these are done

### Supabase (project `kt-appliances`, ref `dsznxzuxtmmwaqocqcfv`)

- [x] Project exists and is healthy
- [x] `0001_init.sql` applied — `appliances`, `appliance_images`, `leads`, indexes, triggers, RLS
- [x] `0002_api_role_grants.sql` applied — verified: `anon` has `SELECT` on the catalogue and **no privileges at all** on `leads`
- [x] `0003_appointments.sql` applied
- [x] `0004_seo_url_submissions.sql` applied (table present)
- [x] `0005_damage_spots.sql` applied (`appliances.damage_spots` present)
- [x] `0006_lead_click_id_and_hardening.sql` applied — `leads.click_id`, pinned `search_path` on all trigger functions, `rls_auto_enable()` revoked from `anon`/`authenticated`
- [x] Storage bucket `appliance-images` exists: public read, 10 MB per file, JPEG/PNG/WebP/AVIF only
- [x] Storage write/delete restricted to the service role (no `anon` policy exists for INSERT/UPDATE/DELETE)

> The database is empty of inventory — 0 rows in `appliances`. That is correct for a
> pre-launch project, and it is why the site currently renders empty states. See §4.

### Environment variables (set these in Vercel → Project → Settings → Environment Variables)

Required, or the site cannot do its job:

- [ ] `NEXT_PUBLIC_SITE_URL=https://kt-appliances.com`
      **Until this is set, `robots.txt` disallows all crawling.** That is deliberate so a
      preview cannot be indexed early — but it also means the live site will not be
      indexed until you set it.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — the **service-role secret**, not the anon key. Pasting
      the anon key here is the most common failure; the admin detects it and says so
      rather than failing with "permission denied".
- [ ] `ADMIN_PASSWORD` — the warehouse password. Anything you would not mind typing on a
      phone, but not a word from the business name.
- [ ] `ADMIN_SESSION_SECRET` — 16+ random characters. `openssl rand -base64 32`.
      **With either admin variable missing, nobody can sign in.** That is by design.
- [ ] `CRON_SECRET` — `openssl rand -base64 32`. The two scheduled routes answer 503
      without it rather than running unauthenticated.

### Vercel

- [x] `vercel.json` is minimal — two cron entries and nothing else; the project deploys
      as a stock Next.js app with no build overrides
- [ ] Production domain `kt-appliances.com` attached, with `www` redirecting to the apex
      (or the reverse — pick one and make `NEXT_PUBLIC_SITE_URL` match it exactly)
- [ ] Confirm the first production build succeeds (it builds clean locally — see
      *Tests performed* in the launch report)
- [ ] Confirm the two cron jobs appear under Vercel → Cron Jobs after the first deploy

### First smoke test on the real domain

Do these by hand once, on a phone, after the first production deploy:

- [ ] `/admin/login` — sign in with the real password
- [ ] Add one real appliance with real photos, publish it
- [ ] Open it as a customer and submit an enquiry about it
- [ ] Confirm the enquiry appears in `/admin/leads` **and** that the notification email arrives
- [ ] Mark it sold, confirm it leaves `/inventory` and the page shows SOLD

---

## 2 · Business data — someone has to confirm these are true

The site publishes all of this. Everything below is currently taken from
`src/lib/site-config.ts`, which is the one place any of it appears.

- [ ] **Address** — `109 Burson St, East Stroudsburg, PA 18301`. Verify it matches the
      Google Business Profile **character for character**; Google matches listings on it.
- [ ] **Phone** — `(973) 519-9717`. Verify this is the line that is actually answered.
      Note it is a 973 (New Jersey) number on a Pennsylvania business — that is unusual
      enough to be worth a deliberate confirmation rather than an assumption.
- [ ] **Email** — `ktappliances20@gmail.com`
- [ ] **Hours** — open daily 10:00–17:00, after-hours 17:00–21:00 by appointment.
      Confirm, including weekends and holidays.
- [ ] **Founded 2000 / family owned** — taken from the company logo. Confirm before it
      sits in the schema and the About page.
- [ ] **Service area** — PA, NJ, NY, and the specific towns in
      `src/lib/content/locations.ts`. Do not advertise a town you will not deliver to.
- [ ] **Warranty policy** — `/warranty` says a 1-year option is *available on qualifying
      appliances*. Confirm what qualifies, what it covers, and what it costs.
- [ ] **Delivery and installation pricing** — the site says pricing is quoted per job and
      names no number. If there is a real price list, it should go in.
- [ ] **Financing** — `/financing` names no provider, no APR, no approval promise. If
      there is a real financing partner, its name, application link and required
      disclosures need to go in before that page can say more.

---

## 3 · Email — leads depend on it

- [x] Resend integration implemented; owner alert includes name, phone, email, ZIP,
      appliance, **listing URL**, message, timestamp, campaign, click ID and source
- [x] The database write happens before any email, and an email failure cannot lose a lead
- [x] If the lead reaches neither the database nor an email, the customer is told to
      call instead of being shown a false success
- [ ] `RESEND_API_KEY` set in Vercel
- [ ] **Verify the sending domain in Resend.** Resend rejects any `from:` on an unverified
      domain, and reports it in the response body rather than by failing loudly. Until
      then, sending falls back to `onboarding@resend.dev`, which only delivers to the
      Resend account owner's own address.
- [ ] `LEADS_FROM_EMAIL` set to an address on the verified domain, e.g. `leads@kt-appliances.com`
- [ ] `LEADS_NOTIFICATION_EMAIL` set to wherever enquiries should land
- [~] End-to-end delivery — cannot be proven without the production API key

---

## 4 · Inventory

- [x] Inventory is database-backed; there is no hardcoded product list on any page
- [x] Sample data cannot appear in production. It is served only when Supabase is
      unconfigured **and** either the build is not production or
      `NEXT_PUBLIC_ENABLE_DEMO_INVENTORY=true` is explicitly set
- [x] Sample data carries a site-wide banner whenever it is active
- [x] Draft and archived appliances are invisible publicly, absent from the sitemap, and
      404 on their own URL
- [ ] **Upload the real inventory.** The database has none. Follow
      [`docs/INVENTORY-GUIDE.md`](INVENTORY-GUIDE.md)
- [ ] Photograph the damage on every unit. The listings fall back to a category
      illustration, which is honest but converts far worse than a real photo
- [ ] Check prices and statuses against the floor before advertising
- [ ] Confirm `NEXT_PUBLIC_ENABLE_DEMO_INVENTORY` is **unset** in production

---

## 5 · Marketing and analytics

All of this is implemented and inert until an ID is present — no phantom conversions
while you are setting up.

- [x] Conversion events fire only on a submission the server accepted, never on a page view
- [x] Google Ads conversion fires on a successful enquiry and a confirmed appointment
- [x] UTM parameters, `gclid`/`fbclid`, landing page and referrer are captured on first
      touch and stored with every lead
- [ ] `NEXT_PUBLIC_GA_ID` — GA4 measurement ID
- [ ] `NEXT_PUBLIC_META_PIXEL_ID`
- [ ] `NEXT_PUBLIC_GOOGLE_ADS_ID` and `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`
      **Both are needed.** Without the label the conversion event does not fire at all.
- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, or verify the domain by DNS (better — it
      covers subdomains and survives redeploys)
- [ ] Submit `https://kt-appliances.com/sitemap.xml` in Google Search Console
- [ ] Claim and complete the Google Business Profile; make the NAP identical to §2
- [ ] `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_MARKETPLACE_URL`
      — social links are hidden entirely while unset, so an empty icon never appears
- [ ] Optional: `INDEXNOW_KEY` (Bing/Yandex only — Google does not use IndexNow)
- [ ] Optional: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (the contact page map works without it)

### Once ads are running

- [ ] Import offline conversions into Google Ads using the `click_id` stored on each
      lead, so bidding optimises against actual sales rather than form fills

---

## 6 · SMS — deliberately switched off

- [x] Twilio transport implemented; every outbound message gated behind `SMS_SENDING_ENABLED`
- [x] The flag is read per request, so no redeploy is needed to flip it
- [x] Enquiry forms capture no SMS consent, so lead confirmations send nothing even once
      the flag is on — this is intentional, not an oversight
- [ ] Wait for A2P 10DLC campaign approval
- [ ] Then set `SMS_SENDING_ENABLED=true`, plus `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
      `TWILIO_MESSAGING_SERVICE_SID` and `APPOINTMENT_NOTIFICATION_PHONE`
- [~] Live message delivery — cannot be proven before the campaign clears

---

## 7 · Verified in this audit — no action needed

Recorded so nobody re-checks them:

- [x] Admin fails closed: with `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` missing, sign-in
      is impossible and every admin page explains what to configure
- [x] Every admin route redirects an unauthenticated visitor to `/admin/login` — verified
      in a browser against `/admin`, `/admin/inventory`, `/admin/inventory/new`, `/admin/leads`
- [x] Authorization is enforced twice: at the edge in `src/proxy.ts` and again inside
      every page and server action via `requireAdmin()`
- [x] Session cookie is HttpOnly, SameSite=Lax, Secure in production, 8-hour expiry, HMAC signed
- [x] Login is rate limited — 5 attempts per IP per 5 minutes (confirmed by tripping it)
- [x] Public forms carry a honeypot and a per-IP rate limit
- [x] The service-role key is only reachable from `server-only` modules; importing one
      into a client component is a build error
- [x] `/admin` sends `X-Robots-Tag: noindex` from both `next.config.ts` and the proxy, and
      is disallowed in `robots.txt`
- [x] An unknown appliance slug returns a real **404**, not a soft 404
- [x] Filtered inventory URLs are `noindex, follow` and canonical to the clean listing;
      paginated pages stay indexable
- [x] No horizontal overflow at 375 / 390 / 430 px across 23 routes
- [x] No unexplained console errors on any public route
- [x] A rejected form no longer clears what the visitor or the owner typed
- [x] `.env.example` documents every variable the code actually reads, and nothing it does not

---

## Deliberately not done

- **No CSV import.** The floor is a few dozen one-of-a-kind units; the form is faster
  than maintaining a spreadsheet mapping.
- **No bulk multi-select actions.** Mark sold and Archive are one tap per row, and at this
  catalogue size a bulk mode is more ways to get it wrong than time saved.
- **No customer accounts, cart or checkout.** This is a lead-generation storefront —
  every path ends in a call, a text or an enquiry, which is how the business actually sells.
