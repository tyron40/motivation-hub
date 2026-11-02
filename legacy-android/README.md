# Motivation Fuel Legacy Android

This is a dependency-free Android client for API 19–23 (Android 4.4–6.0).
It coexists with the Expo SDK 54 application and uses the same production
package ID: `com.tyron40.motivationalapp`.

## Included

- Production Motivation Fuel YouTube discovery and category search
- Church Motivation category from the shared backend
- Official YouTube playback through the installed YouTube/browser app
- Local favorites and named playlists
- AI motivational coach through the production Vercel backend
- TLS 1.2 enablement for Android 4.4/5.0
- No AndroidX, React Native, Expo, Google Play Services, or ad SDK dependency

## Deliberate compatibility limits

Appodeal SDK 4.2+ requires API 24, so ads are disabled in this legacy build.
Purchases, voice transcription, background YouTube audio, and Supabase account
sync remain available only in the modern application. Favorites and playlists
are stored locally on the legacy device.

## Build

Requirements: JDK 17, Android SDK Platform 36, and Gradle 8.13.

```text
cd legacy-android
gradle :app:assembleDebug
gradle :app:lintDebug
```

The debug build uses `com.tyron40.motivationalapp.legacytest`, so it can be
installed safely beside the Play Store app during testing.

## Signed Play APK

Provide the existing Play upload keystore through these environment variables:

- `LEGACY_KEYSTORE_FILE`
- `LEGACY_KEYSTORE_PASSWORD`
- `LEGACY_KEY_ALIAS`
- `LEGACY_KEY_PASSWORD`

Then run `gradle :app:assembleRelease`. Never commit the keystore or passwords.

The release manifest has `minSdk=19` and `maxSdk=23`; modern devices continue
to receive the Expo AAB. Version code 452 is reserved for the legacy APK. The
modern API-24+ artifact must be version 453 or higher when both artifacts are
activated, because Google Play requires the higher-minSdk artifact to carry the
higher version code.

Before production upload, use Play Console's device catalog and verify:

1. Galaxy S3/Android 4.4 receives only legacy version 452.
2. Android 7+ receives only the modern version 453+.
3. Both artifacts use `com.tyron40.motivationalapp` and the same upload key.
4. The legacy APK targets API 36 and contains no Appodeal classes.
