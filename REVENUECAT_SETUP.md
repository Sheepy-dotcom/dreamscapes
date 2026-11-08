# Setting up subscriptions: App Store Connect, Play Console, RevenueCat

Written 8 November 2026. Everything here is dashboard work — no code changes
are needed, and the identifiers below are the ones the app already looks for.
Getting one of them wrong is the single most common cause of "purchases are
not available just now".

## What is already done — do not redo it

| Thing | Where | Value |
|---|---|---|
| iOS SDK key | `index.html:1459` | `appl_YtCjHSZASIlhdEqImJWqVPHOPim` |
| Android SDK key | `index.html:1460` | `goog_uQDLpGdzwbNFwBTAjvfdvyQOlqQ` |
| `app_user_id` | `app.js` `configureRevenueCat()` | the Supabase `user.id` |
| Webhook endpoint | `api/revenuecat-webhook.js` | `/api/revenuecat-webhook` |

The `app_user_id` one matters more than it looks: the webhook writes
`profiles.plan` by matching that id to a Supabase row, and it **refuses any
id that is not a UUID** (returns 202 and ignores the event). The app already
passes the right thing. Never set a custom user id in the RevenueCat
dashboard.

## The identifiers the app matches on

These are read from `REVENUECAT_PRODUCT_IDS` and `REVENUECAT_ENTITLEMENTS` in
`app.js`, and from `entitlementPlanMap` / `productPlanMap` in the webhook.
They must match exactly.

| Plan | Store product id | Entitlement id |
|---|---|---|
| Plus £9.99 | `dreamscapes_plus_monthly` | `dreamscapes_plus` |
| Family £19.99 | `dreamscapes_family_monthly` | `dreamscapes_family` |
| Premier £4.99 (retired) | `dreamscapes_premier_monthly` | `dreamscapes_premier` |

The bare forms `plus`, `family` and `premier` are accepted as entitlement ids
too, but use the prefixed ones.

Product id matching splits on `:` before comparing, so Google Play's
`dreamscapes_family_monthly:monthly-autorenew` form matches fine. **The base
plan id does not matter** — only the part before the colon.

---

## Step 1 — App Store Connect

**Monetization → Subscriptions.**

1. **Use the existing subscription group.** Plus, Family and Premier must all
   sit in the *same* group. That is what lets a parent move between them
   instead of ending up paying for two, and it is what makes the upgrade
   from Plus to Family work as a proration rather than a second charge.
2. **Create the Family subscription.**
   - Reference Name: `DreamScapes Family`
   - Product ID: `dreamscapes_family_monthly`
   - Duration: 1 Month
   - Price: £19.99 (UK), then let Apple generate the other territories
3. **Fill in the required bits or it will not go live.** Each subscription
   needs a localised display name and description, and the group needs a
   review screenshot. Missing these is a silent cause of a product never
   appearing in offerings.
4. **Add the free trial.** On each of Plus and Family: *Subscription Prices →
   Introductory Offers → Create*.
   - Type: **Free trial**
   - Duration: **1 week** — Apple has no "7 days" option, 1 week is it, and
     it matches the "7 days free" copy in the app
   - Territories: all
   - Eligibility: new subscribers
5. **Retire Premier.** Do **not** delete it. Open it and remove every
   territory under *Availability*. That stops new purchases while leaving
   existing Premier subscribers renewing exactly as before — which is the
   whole reason `premier` is still in the plan tables.
6. **Check the paperwork.** *Business → Agreements, Tax, and Banking.* If the
   Paid Apps agreement is not active, or banking or tax forms are incomplete,
   **every product silently reports as unavailable** and the app shows the
   generic error. This catches people out constantly.

## Step 2 — Google Play Console

**Monetize → Products → Subscriptions.**

1. **Create subscription.**
   - Product ID: `dreamscapes_family_monthly` (permanent — it cannot be
     changed or reused later)
   - Name: `DreamScapes Family`
2. **Add a base plan.**
   - Base plan ID: `monthly-autorenew`
   - Type: Auto-renewing, Monthly
   - Price: £19.99, then set the other regions
   - **Activate it.** A base plan left as a draft does not appear.
3. **Add the free trial** as an *Offer* on the base plan: 7 days, eligibility
   "new customers only", then activate the offer.
4. **Do the same trial offer on Plus** (`dreamscapes_plus_monthly`).
5. **Retire Premier** by *deactivating its base plan* — again, do not delete.
   Existing subscribers keep renewing.
6. **The app must be published to a track.** Subscriptions are not
   purchasable at all until the app is live on at least an internal or
   closed testing track. A draft app cannot take a test purchase.

## Step 3 — RevenueCat

**Products → + New.** Add each store product once per platform:

- App Store app → `dreamscapes_plus_monthly`, `dreamscapes_family_monthly`
- Play Store app → the same two ids

If RevenueCat cannot see them, its store credentials are missing — check
*Project settings → Apps*: the iOS app needs the App Store Connect shared
secret / API key, the Android app needs the Play service account JSON.
Without those, receipts cannot be validated and nothing works.

**Entitlements → + New.**

- `dreamscapes_plus` → attach both Plus products (iOS + Android)
- `dreamscapes_family` → attach both Family products
- `dreamscapes_premier` → leave exactly as it is

**Offerings.** This is where it usually goes wrong.

1. Open the offering you want parents to see.
2. Add a **package for each plan**, and attach the right store product to
   each. The package identifier itself does not matter — the app matches on
   the *product* identifier, so `$rc_monthly` or a custom name both work.
3. **Mark the offering Current.** The app reads `offerings.current` and
   nothing else. An account with every product registered correctly but no
   offering marked current returns empty, which is exactly the state that
   produces "purchases are not available just now".

## Step 4 — Webhook

**Project settings → Integrations → Webhooks.**

- URL: `https://www.dreamscapes.cloud/api/revenuecat-webhook`
- Authorization header: the value of `REVENUECAT_WEBHOOK_SECRET` in Vercel
  (plain, or `Bearer <secret>` — the endpoint accepts either)

RevenueCat's **"Send test event" returns 200 but is deliberately ignored** —
the endpoint refuses to write a plan from a `TEST` event. Seeing
`"ignored": true, "reason": "RevenueCat test events do not update
DreamScapes plans."` means it is wired up correctly. That is a pass, not a
failure.

## Step 5 — Test it, on a real device

**This is probably why purchases have never worked.**

RevenueCat purchases **cannot complete in the iOS Simulator** against real
App Store Connect products. There is no App Store account and no StoreKit
sandbox. Offerings may load; the purchase will always fail. Every simulator
test so far proves nothing either way.

**iOS:** *Users and Access → Sandbox → Testers*, create one with an email
that has never been an Apple ID. Install via TestFlight or a device build,
sign out of the real App Store account on the device, start the purchase, and
sign in with the sandbox tester when prompted.

**Android:** add the Google account as a *licence tester* in Play Console
(*Setup → Licence testing*), install from the internal testing track with
that account.

**Then check the plan actually landed:** Supabase → `profiles` → that user's
row → `plan` should read `family`. If the purchase succeeded but the column
did not change, the fault is the webhook, not the store.

## Step 6 — Turn the trial on

Only once the introductory offer is **live in both stores**:

```js
const FREE_TRIAL_ENABLED = true;   // app.js
```

Then `npm run mobile:sync`, bump the `?v=` on `app.js` and `styles.css` in
`index.html`, and ship. Advertising a trial the stores do not actually offer
is grounds for a review rejection on its own, which is why it is a flag.

---

## Decoding the error the app shows

Sign in as **shaunrussett@gmail.com** before testing. That address is in
`ADMIN_EMAILS`, and the app appends the real StoreKit or Play error after
`| ADMIN:` for admins only. Anyone else sees just the friendly line, so
testing on another account throws away the only useful information.

| Message | What it means |
|---|---|
| `No current offering is set in RevenueCat.` | Step 3 — no offering marked Current. |
| `...is not in the current RevenueCat offering. Looking for X; the offering has Y` | The offering is fine, the product id is wrong. Compare X and Y character by character. |
| `RevenueCat is not configured for this app build yet.` | SDK key missing — should not happen, both are in `index.html`. |
| `Purchases are not available just now...` with no `ADMIN:` | You are not signed in as an admin. Sign in again as the admin address and repeat. |
| `Purchases are not available just now... \| ADMIN: <detail>` | The store's own error. Usually incomplete agreements (Apple) or an unpublished track (Play). |
