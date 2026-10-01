/**
 * Expo config plugin: Appodeal SDK (mediation layer).
 *
 * Adds the Appodeal-required iOS configuration so it survives
 * `npx expo prebuild` and EAS builds:
 *   - Info.plist: GADApplicationIdentifier (existing AdMob App ID — Appodeal
 *     mediates AdMob, the AdMob config is NOT removed), ATT usage description,
 *     NSAllowsLocalNetworking (only required ATS setting), SKAdNetworkItems
 *     (official Appodeal list, merged with any existing entries).
 *   - Podfile: Appodeal pod sources + the minimal pod set required by
 *     react-native-appodeal@4.2.0 (Appodeal 4.2.0 + AppodealIABAdapter
 *     3.5.0.0) plus the Appodeal Google AdMob adapter, which keeps AdMob
 *     mediation working. No other mediation adapters are installed.
 *
 * Props (app.json):
 *   - iosAppId: AdMob App ID used for GADApplicationIdentifier
 *   - userTrackingUsageDescription: ATT string (optional, has a default)
 */

const fs = require('fs');
const path = require('path');
const {
  withInfoPlist,
  withDangerousMod,
  withProjectBuildGradle,
  withAppBuildGradle,
} = require('expo/config-plugins');

/** Official Appodeal SKAdNetwork IDs (256). */
const SKAD_NETWORK_IDS = require('./appodeal-skadnetwork-ids.json');

/**
 * Pod sources, in resolution order (CocoaPods uses the first source that
 * contains a podspec):
 *   1. Appodeal spec repo — Appodeal, AppodealIABAdapter,
 *      AppodealGoogleAdMobAdapter.
 *   2. Bidon spec repo — Bidon 0.15.0, a required transitive dependency of
 *      AppodealGoogleAdMobAdapter 13.5.0.0 (not published on trunk or in the
 *      Appodeal repo, so this source must stay while the AdMob adapter is
 *      installed).
 *   3. CocoaPods trunk/CDN — Expo/React Native pods and the Appodeal SDK's
 *      own transitive dependencies (Protobuf, StackConsentManager,
 *      StackModules, Google-Mobile-Ads-SDK).
 */
const POD_SOURCES = [
  "source 'https://github.com/appodeal/CocoaPods.git'",
  "source 'https://github.com/bidon-io/CocoaPods-Specs.git'",
  "source 'https://cdn.cocoapods.org'",
];

/**
 * Minimal Appodeal pod set for react-native-appodeal@4.2.0:
 *   - Appodeal 4.2.0 and AppodealIABAdapter 3.5.0.0 are the exact
 *     dependencies declared by RNAppodeal.podspec.
 *   - AppodealGoogleAdMobAdapter keeps AdMob mediation (the app's configured
 *     ad provider); it transitively pulls Google-Mobile-Ads-SDK 13.5.0 (trunk)
 *     and Bidon 0.15.0 (Bidon spec repo).
 * No other network adapters are installed — the app only initializes Appodeal
 * with AdMob mediation, and the ~76 extra adapters previously listed here
 * caused CocoaPods to flood trunk/GitHub and fail with HTTP 429 on EAS.
 */
const APPODEAL_PODS = `# Appodeal SDK 4.2.0 — proven production mediation set
def appodeal
  pod 'Appodeal', '4.2.0'
  pod 'AppodealAdjustAdapter', '5.4.6.1'
  pod 'AppodealAmazonAdapter', '5.3.2.0'
  pod 'AppodealAppLovinAdapter', '13.5.1.0'
  pod 'AppodealAppLovinMAXAdapter', '13.5.1.1'
  pod 'AppodealAppsFlyerAdapter', '6.17.7.1'
  pod 'AppodealBidMachineAdapter', '3.7.1.0'
  pod 'AppodealBidonAdapter', '0.15.0.0'
  pod 'AppodealBigoAdsAdapter', '5.0.0.0'
  pod 'AppodealDTExchangeAdapter', '8.4.1.0'
  pod 'AppodealFacebookAdapter', '18.0.1.0'
  pod 'AppodealFirebaseAdapter', '12.4.0.1'
  pod 'AppodealGoogleAdMobAdapter', '13.5.0.0'
  pod 'AppodealIABAdapter', '3.5.0.0'
  pod 'AppodealInMobiAdapter', '11.1.0.0'
  pod 'AppodealIronSourceAdapter', '9.1.0.0.0'
  pod 'AppodealLevelPlayAdapter', '9.1.0.0.0'
  pod 'AppodealMetaAudienceNetworkAdapter', '6.20.1.0'
  pod 'AppodealMintegralAdapter', '7.7.9.0'
  pod 'AppodealMyTargetAdapter', '5.36.2.0'
  pod 'AppodealSentryAdapter', '8.57.2.1'
  pod 'AppodealUnityAdapter', '4.16.3.0'
  pod 'AppodealVungleAdapter', '7.6.2.0'
  pod 'AppodealYandexAdapter', '7.17.0.1'
end`;

// Android SDK 4.1+ requires demand-source adapters to be declared separately.
const APPODEAL_ANDROID_ADAPTERS = [
  'implementation("com.appodeal.ads.sdk.adapters:adjust:5.4.6.1")',
  'implementation("com.appodeal.ads.sdk.adapters:admob:24.7.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:amazon:11.3.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:applovin:13.5.1.0")',
  'implementation("com.appodeal.ads.sdk.adapters:applovin_max:13.5.1.1")',
  'implementation("com.appodeal.ads.sdk.adapters:appsflyer:6.18.0.1")',
  'implementation("com.appodeal.ads.sdk.adapters:bidmachine:3.7.1.0")',
  'implementation("com.appodeal.ads.sdk.adapters:bidon:0.14.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:bigo_ads:5.6.2.0")',
  'implementation("com.appodeal.ads.sdk.adapters:dt_exchange:8.4.1.0")',
  'implementation("com.appodeal.ads.sdk.adapters:facebook_analytics:18.0.3.0")',
  'implementation("com.appodeal.ads.sdk.adapters:firebase:23.0.0.1")',
  'implementation("com.appodeal.ads.sdk.adapters:iab:1.8.1.0")',
  'implementation("com.appodeal.ads.sdk.adapters:inmobi:11.1.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:ironsource:9.1.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:level_play:9.1.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:meta:6.21.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:mintegral:17.1.61.0")',
  'implementation("com.appodeal.ads.sdk.adapters:my_target:5.47.1.0")',
  'implementation("com.appodeal.ads.sdk.adapters:sentry_analytics:8.26.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:unity_ads:4.17.0.0")',
  'implementation("com.appodeal.ads.sdk.adapters:vungle:7.6.1.0")',
  'implementation("com.appodeal.ads.sdk.adapters:yandex:7.17.0.0")',
];

function withAppodealInfoPlist(config, props) {
  return withInfoPlist(config, (cfg) => {
    const infoPlist = cfg.modResults;

    // AdMob App ID — Appodeal mediates AdMob. Never overwrite an existing value
    // (react-native-google-mobile-ads sets the same key).
    if (!infoPlist.GADApplicationIdentifier && props.iosAppId) {
      infoPlist.GADApplicationIdentifier = props.iosAppId;
    }

    // ATT (required for personalized ads on iOS 14+)
    if (!infoPlist.NSUserTrackingUsageDescription) {
      infoPlist.NSUserTrackingUsageDescription =
        props.userTrackingUsageDescription ||
        'Motivation Fuel uses your advertising identifier to deliver more relevant ads.';
    }

    // ATS: Appodeal SDK requires arbitrary loads to serve ads
    // (docs.appodeal.com/ios/get-started and react-native-appodeal README,
    // SDK 4.x). NSAllowsLocalNetworking covers local ad assets. Existing
    // exception domains are preserved.
    const ats = infoPlist.NSAppTransportSecurity || {};
    ats.NSAllowsArbitraryLoads = true;
    ats.NSAllowsLocalNetworking = true;
    infoPlist.NSAppTransportSecurity = ats;

    // SKAdNetworkItems — merge + dedupe with existing entries.
    const existing = Array.isArray(infoPlist.SKAdNetworkItems)
      ? infoPlist.SKAdNetworkItems
      : [];
    const seen = new Set(
      existing.map((item) => item && item.SKAdNetworkIdentifier).filter(Boolean)
    );
    for (const id of SKAD_NETWORK_IDS) {
      if (!seen.has(id)) {
        existing.push({ SKAdNetworkIdentifier: id });
        seen.add(id);
      }
    }
    infoPlist.SKAdNetworkItems = existing;

    return cfg;
  });
}

function withAppodealPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
    const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    if (!fs.existsSync(podfilePath)) {
      console.log('[with-appodeal] Podfile not found, skipping');
      return cfg;
    }
    let podfile = fs.readFileSync(podfilePath, 'utf8');

    if (podfile.includes("pod 'Appodeal'")) {
      return cfg; // already configured (repeat prebuild)
    }

    // 1. Add missing pod sources after the last existing source line.
    const sourceRegex = /^source .*$/gm;
    let lastSourceEnd = -1;
    let match;
    while ((match = sourceRegex.exec(podfile)) !== null) {
      lastSourceEnd = match.index + match[0].length;
    }
    const missingSources = POD_SOURCES.filter(
      (line) => !podfile.includes(line.replace(/^source '|'$/g, ''))
    );
    if (missingSources.length > 0) {
      const insertion =
        lastSourceEnd >= 0
          ? lastSourceEnd
          : podfile.indexOf('\n');
      podfile =
        podfile.slice(0, insertion) +
        '\n' +
        missingSources.join('\n') +
        podfile.slice(insertion);
    }

    // 2. use_frameworks (static linkage) — required by Appodeal. Only added
    //    when not already configured by another plugin/package.
    const targetIndex = podfile.search(/^target /m);
    if (targetIndex >= 0 && !/^use_frameworks!/m.test(podfile)) {
      podfile =
        podfile.slice(0, targetIndex) +
        "# Appodeal SDK requires static frameworks\nuse_frameworks! :linkage => :static\n\n" +
        podfile.slice(targetIndex);
    }

    // 3. Insert the Appodeal pod definition before the first target block.
    const targetIndexAfterFrameworks = podfile.search(/^target /m);
    if (targetIndexAfterFrameworks >= 0) {
      podfile =
        podfile.slice(0, targetIndexAfterFrameworks) +
        APPODEAL_PODS +
        '\n\n' +
        podfile.slice(targetIndexAfterFrameworks);
    }

    // 4. Activate the pods inside the app target, right after native modules.
    const nativeModulesIndex = podfile.search(/^[ \t]*config = use_native_modules!.*$/m);
    if (nativeModulesIndex >= 0) {
      const lineEnd =
        nativeModulesIndex + podfile.slice(nativeModulesIndex).indexOf('\n') + 1;
      podfile =
        podfile.slice(0, lineEnd) +
        '  appodeal\n' +
        podfile.slice(lineEnd);
    }

    fs.writeFileSync(podfilePath, podfile);
    console.log('[with-appodeal] Appodeal pods + sources injected into Podfile');
    return cfg;
  },
  ]);
}

function withAppodealAndroidRepository(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const repository =
      'maven { url = uri("https://artifactory.appodeal.com/appodeal") }';
    const contents = cfg.modResults.contents;

    if (contents.includes('https://artifactory.appodeal.com/appodeal')) {
      return cfg;
    }

    const projectRepositories =
      /(allprojects\s*\{[\s\S]*?repositories\s*\{)/;

    if (!projectRepositories.test(contents)) {
      throw new Error(
        '[with-appodeal] Android project repositories block not found'
      );
    }

    cfg.modResults.contents = contents.replace(
      projectRepositories,
      `$1\n        ${repository}`
    );

    console.log(
      '[with-appodeal] Appodeal Android Maven repository configured'
    );

    return cfg;
  });
}

function withAppodealAndroidAdapters(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    const missingAdapters = APPODEAL_ANDROID_ADAPTERS.filter(
      (dependency) => {
        const coordinate = dependency.match(/"([^"]+)"/)?.[1];
        return coordinate && !contents.includes(coordinate);
      }
    );

    if (missingAdapters.length === 0) {
      return cfg;
    }

    const dependenciesBlock = /dependencies\s*\{/;

    if (!dependenciesBlock.test(contents)) {
      throw new Error(
        '[with-appodeal] Android app dependencies block not found'
      );
    }

    contents = contents.replace(
      dependenciesBlock,
      `dependencies {\n    // Appodeal Android mediation adapters (SDK 4.1+)\n    ${missingAdapters.join('\n    ')}`
    );

    cfg.modResults.contents = contents;
    console.log('[with-appodeal] Android mediation adapters configured');
    return cfg;
  });
}

function withAppodeal(config, props = {}) {
  config = withAppodealAndroidRepository(config);
  config = withAppodealAndroidAdapters(config);
  config = withAppodealInfoPlist(config, props);
  config = withAppodealPodfile(config);
  return config;
}

module.exports = withAppodeal;
