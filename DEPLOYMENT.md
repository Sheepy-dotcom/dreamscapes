# DreamScapes Domain Setup

Domain: `dreamscapes.cloud`  
Preferred public URL: `www.dreamscapes.cloud`

## Recommended Hosting: Vercel

DreamScapes is currently a static app, so it can be deployed directly to Vercel.

## Vercel Dashboard Deployment

1. Go to the Vercel dashboard.
2. Create a new project.
3. Import the GitHub repository:

```txt
https://github.com/Sheepy-dotcom/dreamscapes
```

4. Use the default static-site settings. There is no build command.
5. Deploy the project.
6. Open Project Settings, then Domains.
7. Add:

```txt
www.dreamscapes.cloud
dreamscapes.cloud
```

Set `www.dreamscapes.cloud` as the primary domain, and redirect `dreamscapes.cloud` to `www.dreamscapes.cloud`.

## OpenAI Features

DreamScapes includes Vercel serverless endpoints for real AI features:

```txt
/api/story
/api/narrate
/api/create-checkout-session
```

To enable AI story generation and studio-quality narration, add this environment variable in Vercel Project Settings:

```txt
OPENAI_API_KEY=your_openai_api_key
```

Optional story model override:

```txt
OPENAI_STORY_MODEL=gpt-4o-mini
```

After adding the key, redeploy the project. Story generation will use `/api/story`, and DreamScapes Plus audio will generate MP3 narration through `/api/narrate`. Generated audio is cached with the saved story on the device so replaying does not make another AI request. If the key is missing, the app falls back to the local template story and device voice.

## Stripe Subscriptions

DreamScapes can start hosted Stripe Checkout for Premier and DreamScapes Plus subscriptions. Create two recurring monthly Prices in Stripe:

```txt
Premier: £4.99/month
DreamScapes Plus: £9.99/month
```

Then add these environment variables in Vercel:

```txt
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_PREMIER_PRICE_ID=price_...
STRIPE_PLUS_PRICE_ID=price_...
SITE_URL=https://www.dreamscapes.cloud
```

Until these are configured, the pricing buttons keep working in preview mode and switch the local prototype plan without taking payment.

## DNS Records

After the app is deployed, the hosting provider will give you a target address. Add these records wherever the domain DNS is managed.

### For `www.dreamscapes.cloud`

Use a CNAME record:

```txt
Type: CNAME
Name: www
Value: your-hosting-target
TTL: Auto
```

Vercel may show a project-specific CNAME. Use the exact value shown in the Vercel dashboard.

### For `dreamscapes.cloud`

Point the root domain to the same site using the hosting provider's recommended root-domain setup.

Common Vercel option:

```txt
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

Vercel may show a different or project-specific value. Use the exact value shown in the Vercel dashboard if it differs.

## Redirect

Set the root domain to redirect to:

```txt
https://www.dreamscapes.cloud
```

## Before Launch

- Confirm HTTPS is active.
- Confirm `www.dreamscapes.cloud` loads the app.
- Confirm `dreamscapes.cloud` redirects to `www.dreamscapes.cloud`.
- Add real backend services before taking payments, generating AI stories, or storing user accounts.
