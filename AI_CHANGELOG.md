# AI Change Log — showcase (AlephK public showcase)

Keeps the latest 15 changes made with Claude (oldest are removed). Newest first.

---

## 30. 2026-11-08 — "Request sent — pending approval" pop-up

**Backups:** `.ai_backups/2026-11-08_before_request_sent_popup/`.

**Description:** works with shao #43. New component `RequestSentDialog` (+ .scss), shown after every request the
company must approve or confirm, until the customer presses "Got it" (also Escape / backdrop):
- store booking request (reference, service, date · time, location), store order request (guest and signed in;
  the payment notice stays below), manage page: new time and cancellation request;
- texts: it is NOT confirmed yet; "Check your email (address)": a copy was sent now and another email comes when the
  company approves or rejects it (cancellation: confirms it); look in Spam or Promotions;
- "No email? Contact <company>:" WhatsApp (wa.me), customer service email (mailto) and social link, each only when
  set; none = "Please contact <company>.".
The company data comes from shao (`contactEmail` new). The small notices stay as before. en/es texts `requestSent.*`.
Browser-tested (en/es, computer and phone width): the four flows, with and without contacts; earlier tests pass.
AI knowledge: updated in shao (#43: Aleph and the store assistant) and usersAppAK #26.

**New:** src/App/modules/showcase/components/RequestSentDialog.jsx + .scss

**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx, ManageRequest.jsx,
src/App/shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder and delete the two new files.

---

## 29. 2026-11-08 — Store booking window: contact fields at the end

**Backups:** `.ai_backups/2026-11-08_before_booking_info_last/`.

**Description:** new order of the booking window: date → available times → "Your choice" → "Your information"
(name, phone, email, preferred contact, contact, notes) → Send. After choosing a time the window scrolls to "Your
choice" with the contact fields right below. Fix of #28: on phones (two stacked buttons) the ↑ button sits above
both buttons instead of over Send. New text `companyShowcase.booking.yourInfo` ("Your information" / "Sus datos").
Browser-tested (computer and phone width, en/es, with/without locations, location without address): order, name field
visible after the time, request sent, ↑ not over Send; earlier tests pass.
AI knowledge: updated in shao (`bAssistantPrompt.go`, shao #42) and usersAppAK #25.

**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx + .scss,
src/App/shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 28. 2026-11-08 — Store booking window: scroll to times, "Your choice", back to top

**Backups:** `.ai_backups/2026-11-08_before_appointment_location/`.

**Description:**
- After choosing a date the window scrolls smoothly to "Available times".
- After choosing a time a "Your choice" box shows date · time (or "All day") · location + address above Send, and the
  window scrolls to it. A short line says how to change it (choose another date or time above).
- A round ↑ button appears when the window is scrolled down and goes back to the top.
Browser-tested (en/es): scroll to times, scroll to "Your choice", ↑ button back to 0, earlier location tests.
AI knowledge: updated in shao (`bAssistantPrompt.go`, shao #41).

**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx + .scss,
src/App/shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 27. 2026-11-08 — Store: "You choose the location"

**Backups:** `.ai_backups/2026-11-08_before_locations_options/`.

**Description:** works with shao #35. When a block of hours is "Customer chooses", shao repeats those times in every
active location (`customerChoosesLocation: true`); the store shows a short note above the location filter ("You
choose the location: pick the time in the location you prefer.") and the request sends the location the customer
picked. When the company turns "We use locations" OFF, shao sends no location and the store shows the times as
before (nothing to change here). New helper `slotsLetCustomerChoose()` in `slotLocations.js`; en/es texts.
Browser-tested: customer-chooses times, fixed locations, locations off.
AI knowledge: updated in shao (`bShowcasePrompt.go`, shao #35).

**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx + .scss,
src/App/modules/showcase/services/slotLocations.js, src/App/shared/i18n/locales/en.json, es.json

**Undo:** restore the `.bak` files from the backup folder.

---

## 26. 2026-11-07 — Store: free times by location + location in confirmations

**Backups:** `.ai_backups/2026-11-07_before_company_locations/`.

**Description:** works with shao #34. Booking dialog: when the times have a location, they are grouped by location
(name, address, details, **"Open in Maps"**); with 2 or more locations, chips **"All locations / Heredia / San
Pedro"** filter them. The same hour in two locations is two different times. The request sends `locationId`; the
confirmation says "Location: name, address". Manage my request: new "Location" row with "Open in Maps"; "Request
another time" groups the times by location and sends `locationId`. My bookings shows the location. New helper
`services/slotLocations.js` (only https Google Maps links are opened). Without locations everything looks as before.
en/es texts. Browser-tested. AI knowledge: updated in shao (store assistant).

**Created:** src/App/modules/showcase/services/slotLocations.js
**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx (+ .scss), ManageRequest.jsx (+ .scss),
MyRequests.jsx, src/App/modules/showcase/services/SelfServiceService.js, src/App/shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/") and delete `slotLocations.js`.

---

## 25. 2026-11-04 — Store top bar: company time

**Backups:** `.ai_backups/2026-11-04_before_header_clock/`.

**Description:** works with shao #32. `CompanyShowcase.jsx`: new `ShowcaseClock` in the store top bar (before the
dark-mode button): "Hora de Costa Rica · GMT−6 / 11:28" (company zone and text for customers from the public page
configuration); a visitor in another zone also sees "= 02:28 your time". Refreshed every 15 s; shown once the page
configuration is loaded. .scss (small screens: time only; hidden under 420 px) and en/es texts (`companyShowcase.clock`).
Browser-tested (Costa Rica, Tokyo, no configuration). AI knowledge: updated in shao.

**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx, CompanyShowcase.scss,
src/App/shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/").

---

## 24. 2026-11-04 — Store: "today" and hours in the company time zone

**Backups:** `.ai_backups/2026-11-04_before_company_time_zone/`.

**Description:** works with shao #32. `CompanyShowcase.jsx`: the booking calendar uses **today of the company zone**
(from the public page configuration, default Costa Rica) instead of the visitor's device, and opens on that month.
Under the times: "Times shown in: Hora de Costa Rica (GMT−6)." When the visitor's device is in another zone, each time
also shows **"= 05:00 your time"** (with the day when it is another day). `ManageRequest.jsx` (customer link): the
appointment time shows the zone ("Nueva York (Este de EE. UU.), GMT−4") and the visitor's time when different; the
new-date field starts at today of the company. New `src/App/shared/Utils/timeZones.js` (copy of p3). .scss and en/es
texts. Browser-tested (Tokyo, Costa Rica, Madrid, New York). AI knowledge: updated in shao (store assistant TODAY line).

**Created:** src/App/shared/Utils/timeZones.js
**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx, CompanyShowcase.scss, ManageRequest.jsx,
ManageRequest.scss, src/App/shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back ("__" = "/") and delete the created file.

---

## 23. 2026-10-31 — "Contact us" uses the company WhatsApp and social link

**Backups:** `.ai_backups/2026-10-31_before_company_contact/`.

**Description:** works with shao #28. `CompanyShowcase.jsx`: "Contact us" shows the **company** WhatsApp (Company page)
and the **company social link** with its icon (Facebook / Messenger, Instagram, TikTok, or a link icon), each only when
set; with neither, no "Contact us" button. The WhatsApp message still names the product. Book = appointment; Add to cart
= available for web sales (kind from shao). `showcaseMappers.js`: comments. Browser-tested (both / WhatsApp only /
social only / none).

**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx, src/App/modules/showcase/services/showcaseMappers.js

**Revert:** copy the `.bak` files back ("__" = "/").

---

## 22. 2026-10-31 — Domains: env examples for aleph-k.com / aleph-k.online

**Backups:** `.ai_backups/2026-10-31_before_domains/`.

**Description:** works with shao #27 / usersAppAK #13. `env.example.NEW.txt` shows the real names
(`https://auth.aleph-k.com`, `https://api.aleph-k.com`, `https://store.aleph-k.com`) and how to build a store for
aleph-k.online (`auth.aleph-k.online` / `api.aleph-k.online`). `.env.example` cannot be written remotely (copy the lines by hand if you use it). No code change: all addresses already come from `.env`.

**Modified:** env.example.NEW.txt

**Revert:** copy the `.bak` files back.

---

## 21. 2026-10-26 — Store sign-in buttons controlled from .env (active / soon / hidden) + legal legend

**Backups:** `.ai_backups/2026-10-26_before_login_flags_legal/`.

**Description:** new `src/App/shared/Utils/authProviders.js` (same as p3): flags `REACT_APP_AUTH_GOOGLE`, `_EMAIL`,
`_MICROSOFT`, `_FACEBOOK`, `_APPLE` = `active` | `soon` (shown with "Próximamente / Coming soon"; clicking only shows
the "available soon" message, no sign-in code runs) | `hidden` (not shown). Missing = active; misspelled = hidden.
Store account dialog: provider buttons filtered by the flags; email form hidden / "soon" by `REACT_APP_AUTH_EMAIL`;
the Apple code is kept. `PoweredBy` (store and "manage my request" pages) shows the legal legend with the cédula
jurídica 3-101-789271 and links to https://www.kuantumk.com (new tab). New flags in `env.example.NEW.txt`.

**Created:** src/App/shared/Utils/authProviders.js
**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx, src/App/shared/Brand/BrandLogo.jsx,
src/App/shared/Brand/Brand.scss, env.example.NEW.txt

**Revert:** copy the `.bak` files back (README lists each path), delete src/App/shared/Utils/authProviders.js.

---

## 20. 2026-10-25 — AlephK brand in the store: "Powered by Kuantum K", brand line, icons

**Backups:** `.ai_backups/2026-10-25_before_alephk_brand/`.

**Description:** new `src/App/shared/Brand/BrandLogo.jsx` + Brand.scss (same as p3). Store and "manage my request"
pages start with a slim AlephK bar (AK logo + AlephK) ABOVE the company's own header, and end with a small
"Powered by Kuantum K" line; thin navy→teal line at the top of every store page (the company's
own brand stays the main one). Tab title "AlephK Store", theme color #14243B, manifest, favicon.ico, logo192/512.png
from the AK logo. en/es text brand.poweredBy.

**Created:** src/App/shared/Brand/BrandLogo.jsx, Brand.scss, public/ak-mark.svg
**Modified:** public/index.html, manifest.json, favicon.ico, logo192.png, logo512.png, CompanyShowcase.jsx,
ManageRequest.jsx, locales en.json/es.json

**Revert:** copy the `.bak` files back, delete the Brand folder and ak-mark.svg.

---

## 19. 2026-10-25 — Store assistant: "Select language" list for dictation

**Backups:** `.ai_backups/2026-10-25_before_voice_language/`.

**Description:** same "Select language" button (English / Español, default English, saved in this browser) in the store
assistant; dictation uses it (`en-US` / `es-CR`) instead of the store language. en/es text.

**Created:** src/App/modules/showcase/components/VoiceLanguageSelect.jsx
**Modified:** components/ShowcaseAssistant.jsx, ShowcaseAssistant.scss, src/App/shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back, delete VoiceLanguageSelect.jsx.

---

## 18. 2026-10-25 — CAPTCHA (Cloudflare Turnstile) on store orders and bookings

**Control point:** CC 2. Backups: `.ai_backups/CC2_before_captcha/`.

**Description:** new `src/App/shared/Hooks/useCaptcha.js` (same as p3). The cart forms (guest and account) and the booking
window show the Turnstile box above the send button; the services send `X-Captcha-Token`; a new token after every
attempt; messages for pending / failed / unavailable check (en/es). New `env.example.NEW.txt` with
`REACT_APP_TURNSTILE_SITE_KEY`.

**Created:** src/App/shared/Hooks/useCaptcha.js, env.example.NEW.txt
**Modified:** src/App/modules/showcase/components/CompanyShowcase.jsx, services/WebOrderRequestService.js,
services/AppointmentRequestService.js, src/App/shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back, delete the created files, rebuild the store.

---

## 17. 2026-10-25 — Store forms: messages for the new spam protection (security S4)

**Control point:** CC 1. Backups: `.ai_backups/CC1_before_security_fixes/`.

**Description:** order and booking forms show translated messages for the new server checks: too many requests today
(`PUBLIC_FORM_LIMIT`, 429), email or phone not valid, text too long (400). .gitignore adds .env, .env.production,
.ai_backups/. en/es texts.

**Modified:** .gitignore, src/App/modules/showcase/components/CompanyShowcase.jsx, src/App/shared/i18n/locales/en.json, es.json

**Revert:** copy the `.bak` files back.

---

## 16. 2026-10-24 — Light / dark mode in the public store

**Description:**
- New moon / sun button in the store header (next to the account and cart buttons) switches light ↔ dark.
  Default: same as the visitor's device; the choice is saved in that browser (`alephk.showcase.theme`).
- Same method as p3: the page is inverted once; photos, logos, maps, the company banner and the header logo keep their
  real colors. Windows opened as `<dialog>` (sign-in, product zoom, terms, my orders) get the filter themselves, because the
  browser draws them outside the page. Add the class `keep-colors` to anything that must not change.
- Applies to every store page (also the "manage my request" page). English and Spanish texts for the button.

**Files created:** `src/App/shared/Hooks/useTheme.js`, `src/App/shared/Styles/DarkTheme.scss`,
`.ai_backups/2026-10-24_before_store_dark_mode/`.

**Files modified:** `src/App.js`, `components/CompanyShowcase.jsx`, `CompanyShowcase.scss`, `shared/i18n/locales/en.json`, `es.json`.

**Revert:** see the backup `README.txt`.

---
