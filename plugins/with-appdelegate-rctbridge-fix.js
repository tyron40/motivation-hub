const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchAppDelegate(contents) {
  let out = contents;

  // RN/Expo SDK 54 AppDelegate templates can reference RCTBridge where module import is unavailable.
  // Prefer adapting signature to avoid requiring React_RCTBridge module import.
  out = out.replace(
    /override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{/g,
    'override func sourceURL() -> URL? {'
  );

  // Method body can continue using bundleURL helper directly.
  out = out.replace(
    /bridge\.bundleURL \?\? bundleURL\(\)/g,
    'bundleURL()'
  );

  // Remove invalid import if previously inserted
  out = out.replace(/^\s*import React_RCTBridge\s*[\r\n]+/m, '');

  return out;
}

module.exports = function withAppDelegateRCTBridgeFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const appName = config.modRequest.projectName || config.expo?.name || 'App';
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        appName,
        'AppDelegate.swift'
      );

      if (fs.existsSync(appDelegatePath)) {
        const original = fs.readFileSync(appDelegatePath, 'utf8');
        const patched = patchAppDelegate(original);
        if (patched !== original) {
          fs.writeFileSync(appDelegatePath, patched);
          console.log('[with-appdelegate-rctbridge-fix] Patched AppDelegate.swift');
        } else {
          console.log('[with-appdelegate-rctbridge-fix] No AppDelegate changes needed');
        }
      } else {
        console.log('[with-appdelegate-rctbridge-fix] AppDelegate.swift not found, skipping');
      }

      return config;
    },
  ]);
};
