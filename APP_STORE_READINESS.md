# DreamScapes App Store Readiness

## Payments

- Use Apple in-app purchases for iOS subscriptions.
- Use Google Play Billing for Android subscriptions.
- Keep RevenueCat as the shared subscription layer.
- RevenueCat should send purchase updates to `/api/revenuecat-webhook`.
- The webhook must stay configured with `SUPABASE_SERVICE_ROLE_KEY` and `REVENUECAT_WEBHOOK_SECRET` in Vercel.
- Plan access in the app should come from the Supabase `profiles.plan` value updated by RevenueCat.

## Products

- DreamScapes Premier monthly: 15 stories/month, saved library, stories up to 20 minutes.
- DreamScapes Plus monthly: 30 stories/month, saved library, stories up to 30 minutes, 150 audio minutes/month.
- Free: 3 stories/month, 5 and 10 minute text stories.

## Audio Support

- Audio minutes should only be counted after audio generation completes.
- If audio fails or sounds wrong, parents can use Report Audio Issue.
- Audio reports are stored in `audio_issue_reports`.
- Review reports in Supabase and mark them `reviewing`, `credited`, or `closed`.
- Manual credit decisions should be recorded in `support_note` until an admin dashboard exists.

## Store Listing Assets

- App icon for iOS and Android.
- Splash screen image.
- iPhone screenshots.
- iPad screenshots if supporting iPad.
- Android phone screenshots.
- Short description.
- Full description.
- Keywords.
- Support URL: `https://www.dreamscapes.cloud/`
- Contact email: `support@dreamscapes.cloud`

## Privacy And Safety

- Confirm the app is parent-led and not for unsupervised child use.
- Complete Apple privacy nutrition labels.
- Complete Google Play Data Safety.
- Declare account creation, saved stories, AI processing, and subscription usage.
- Avoid collecting unnecessary child personal data.
- Keep Legal & Support visible inside the app.

## Testing

- Test free, Premier, and Plus accounts.
- Test RevenueCat sandbox purchase and cancellation.
- Test story generation limits.
- Test audio generation limits.
- Test failed audio report flow.
- Test password reset.
- Test saved library delete.
- Test iOS and Android builds after every major web change with `npm run mobile:sync`.
