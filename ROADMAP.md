# DreamScapes Production Roadmap

## Current Prototype

- Static app hosted on Vercel.
- Local story generation fallback.
- Local saved stories and usage counters.
- Browser speech synthesis preview for narration.
- Placeholder policy, safety, terms, contact, PDF, illustration, share, and sleep timer features.

## Backend Needed For Launch

### Accounts

- Parent signup and login.
- Child profiles linked to parent accounts.
- Account deletion and data export.
- Secure saved story library.

### AI Story Generation

- Server endpoint for story prompts.
- Server-side safety checks.
- Word-count targets by duration.
- Plan limit enforcement on the server.
- Prompt and output logging for moderation and support.

### Payments

- Stripe subscriptions for Free, Premier, and DreamScapes Plus.
- Webhooks to update subscription status.
- Billing portal for cancellation and payment method updates.
- Credit reset by billing period.

### Audio Narration

- Replace browser `speechSynthesis` with production text-to-speech.
- Store generated MP3 files per story.
- Generate long stories in audio sections for reliability.
- Add voice library, playback position, speed, and sleep timer.
- Keep audio Plus-only because generation has meaningful cost.

### Premium Assets

- AI story illustrations.
- Printable PDF storybooks.
- Share links for family.
- Downloadable audio for Plus.

## Compliance Before Paid Launch

- Solicitor-reviewed Terms and Privacy Policy.
- Child safety and parent consent language.
- Support email and safety report process.
- Data retention and deletion policy.
- Analytics consent/cookie position if using third-party analytics.
