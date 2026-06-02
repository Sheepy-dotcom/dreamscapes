# DreamScapes Mobile Setup

DreamScapes now has a Capacitor shell for iOS and Android.

## Build And Sync

After changing the web app, run:

```bash
npm run mobile:sync
```

This copies the static DreamScapes web app into `www` and syncs it into:

- `ios/`
- `android/`

## Open Native Projects

iOS:

```bash
npm run mobile:ios
```

Android:

```bash
npm run mobile:android
```

## App IDs

Current Capacitor app ID:

```text
cloud.dreamscapes.app
```

Current app name:

```text
DreamScapes
```

Use the same app ID/bundle ID when setting up Apple App Store Connect, Google Play Console, and RevenueCat apps.

## RevenueCat Next Step

When RevenueCat is added to the mobile app, configure it using the Supabase user ID as the RevenueCat App User ID:

```text
RevenueCat app_user_id = Supabase auth user.id
```

This is required so the RevenueCat webhook can update `profiles.plan` in Supabase.

## Notes

- `www/` is generated build output and is ignored by git.
- The iOS and Android folders are native app projects and should be committed.
- Android Gradle sync may need Android Studio/SDK setup on the machine.
