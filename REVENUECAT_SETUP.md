# DreamScapes RevenueCat Setup

RevenueCat should be the source of truth for paid mobile subscriptions.
DreamScapes reads the user plan from Supabase `profiles.plan`.

## Entitlements

Create these RevenueCat entitlements:

- `dreamscapes_premier`
- `dreamscapes_plus`

The webhook also accepts shorter entitlement IDs:

- `premier`
- `plus`

## Product IDs

Suggested monthly product IDs:

- `dreamscapes_premier_monthly`
- `dreamscapes_plus_monthly`

## Webhook URL

Use this URL in RevenueCat:

```text
https://www.dreamscapes.cloud/api/revenuecat-webhook
```

## Vercel Environment Variables

Add these in Vercel project settings:

```text
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REVENUECAT_WEBHOOK_SECRET=your_long_random_webhook_secret
```

Optional, because the app already has the project URL as a fallback:

```text
SUPABASE_URL=https://khgzzrixhetaontmdhez.supabase.co
```

Do not put the service role key in frontend code.

## RevenueCat Webhook Authorization

In RevenueCat, set the webhook Authorization header to either:

```text
Bearer your_long_random_webhook_secret
```

or:

```text
your_long_random_webhook_secret
```

The webhook accepts both formats.

## App User ID

When the iOS/Android app is built, RevenueCat must be configured with the Supabase user ID as the RevenueCat App User ID.

That means:

```text
RevenueCat app_user_id = Supabase auth user.id
```

This is how the webhook knows which Supabase profile to update.
