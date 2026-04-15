const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchAppDelegate(contents) {
  let out = contents;

  // Ensure import exists when method signature uses RCTBridge
  if (out.includes('sourceURL(for bridge: RCTBridge)') && !out.includes('import React_RCTBridge')) {
    out = out.replace(/(import Expo[\s\S]*?\n)/, `$1import React_RCTBridge\n`);
  }

  // Fallback: if import insertion point not matched, prepend
  if (out.includes('sourceURL(for bridge: RCTBridge)') && !out.includes('import React_RCTBridge')) {
    out = `import React_RCTBridge\n${out}`;
  }

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
