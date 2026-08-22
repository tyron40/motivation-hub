/**
 * TypeScript-only barrel for `@/lib/AppodealManager`.
 *
 * Metro NEVER bundles this file: platform extensions take priority, so
 * `AppodealManager.native.ts` is resolved on iOS/Android and
 * `AppodealManager.web.ts` on web. This barrel exists purely so `tsc` can
 * resolve the import (consumers are type-checked against the native API,
 * which is the superset).
 */
export { default, ADS_DEBUG } from './AppodealManager.native';
