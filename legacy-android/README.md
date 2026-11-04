# Motivation Fuel Legacy (Android 4.4 / API 19)

Separate, **experimental** native Android app. Existing production Expo app is untouched.

## Implemented
- API 19 minimum Android SDK; distinct package name.
- User-configurable public HTTPS JSON feed with title, category, and media URL.
- Open HTTPS media links in installed Android media players.
- Local favorites stored on the device.

## Not implemented
- Production Motivation Fuel backend mapping, authentication, account synchronization, playlists, embedded player, or Appodeal advertising. No claims of Appodeal support for KitKat.
- Play Store publication. The target SDK is intentionally legacy and is not suitable for new Play submissions.
- Real-device testing and APK verification.

Feed schema: `{ "items": [{ "title": "Example", "category": "Motivation", "url": "https://example.org/audio.mp3" }] }`. Configure a public HTTPS feed in the app. **Never put secrets in a public feed.** Android 4.4 certificate support may prevent connections to some modern HTTPS servers; do not disable TLS verification.

Build: JDK 17, Android SDK 35, Gradle 8.7, `gradle :app:assembleDebug` from this directory. A GitHub Actions workflow builds an unsigned-for-distribution debug APK artifact for manual testing. Only install APKs you trust. Legacy Android is unsupported and should not handle sensitive accounts.
