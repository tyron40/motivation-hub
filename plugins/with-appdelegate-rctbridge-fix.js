const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchAppDelegate(contents) {
  let out = contents;

  // Remove obsolete sourceURL overrides entirely (Expo/RN template drift)
  out = out.replace(
    /\n\s*override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{\n[\s\S]*?\n\s*\}\n/gm,
    '\n'
  );

  out = out.replace(
    /\n\s*override func sourceURL\(\) -> URL\? \{\n[\s\S]*?\n\s*\}\n/gm,
    '\n'
  );

  // Remove invalid imports that may have been added by previous attempts
  out = out.replace(/^\s*import React_RCTBridge\s*[\r\n]+/gm, '');

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
