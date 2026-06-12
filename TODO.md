# TODO - Play Store Photo/Video Permission Policy Fix

- [x] Identify policy-violating Android permissions in `app.json`
- [x] Remove `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` from Android permissions
- [x] Bump Android `versionCode` for compliant resubmission
- [x] Validate final Expo config does not include broad media/storage permissions
- [x] Prepare build+submit commands for Google Play rollout
