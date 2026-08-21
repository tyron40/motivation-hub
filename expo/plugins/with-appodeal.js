/**
 * Expo config plugin: Appodeal SDK (mediation layer).
 *
 * Adds the Appodeal-required iOS configuration so it survives
 * `npx expo prebuild` and EAS builds:
 *   - Info.plist: GADApplicationIdentifier (existing AdMob App ID — Appodeal
 *     mediates AdMob, the AdMob config is NOT removed), ATT usage description,
 *     NSAllowsLocalNetworking (only required ATS setting), SKAdNetworkItems
 *     (official Appodeal list, merged with any existing entries).
 *   - Podfile: Appodeal pod sources + the adapter set matched to
 *     react-native-appodeal@4.2.0 (Appodeal iOS SDK 4.2.0).
 *
 * Props (app.json):
 *   - iosAppId: AdMob App ID used for GADApplicationIdentifier
 *   - userTrackingUsageDescription: ATT string (optional, has a default)
 */

const fs = require('fs');
const path = require('path');
const { withInfoPlist, withDangerousMod } = require('expo/config-plugins');

/** Official Appodeal SKAdNetwork IDs (256). */
const SKAD_NETWORK_IDS = require('./appodeal-skadnetwork-ids.json');

/** Pod sources required by Appodeal SDK 4.2.0. */
const POD_SOURCES = [
  "source 'https://github.com/appodeal/CocoaPods.git'",
  "source 'https://github.com/bidon-io/CocoaPods-Specs.git'",
  "source 'https://cdn.cocoapods.org'",
];

/** Adapter pods matched to react-native-appodeal@4.2.0 (official example Podfile). */
const APPODEAL_PODS = `# Appodeal SDK 4.2.0
def appodeal
  pod 'Appodeal', '4.2.0'
  # AppLovin MAX
  pod 'AppLovinMediationAmazonAdMarketplaceAdapter', '5.3.2.0'
  pod 'AppLovinMediationBidMachineAdapter', '3.7.1.0.0'
  pod 'AppLovinMediationBigoAdsAdapter', '5.0.0.0'
  pod 'AppLovinMediationByteDanceAdapter', '7.7.0.7.0'
  pod 'AppLovinMediationChartboostAdapter', '9.10.1.0'
  pod 'AppLovinMediationFacebookAdapter', '6.20.1.0'
  pod 'AppLovinMediationFyberAdapter', '8.4.1.0'
  pod 'AppLovinMediationGoogleAdManagerAdapter', '12.13.0.0'
  pod 'AppLovinMediationGoogleAdapter', '12.13.0.0'
  pod 'AppLovinMediationInMobiAdapter', '11.1.0.0'
  pod 'AppLovinMediationIronSourceAdapter', '9.1.0.0.0'
  pod 'AppLovinMediationMintegralAdapter', '7.7.9.0.0'
  pod 'AppLovinMediationMobileFuseAdapter', '1.9.3.0'
  pod 'AppLovinMediationMolocoAdapter', '4.1.0.0'
  pod 'AppLovinMediationMyTargetAdapter', '5.36.2.0'
  pod 'AppLovinMediationOguryPresageAdapter', '5.1.1.0'
  pod 'AppLovinMediationPubMaticAdapter', '4.10.0.0'
  pod 'AppLovinMediationSmaatoAdapter', '23.1.0.0'
  pod 'AppLovinMediationUnityAdsAdapter', '4.16.3.0'
  pod 'AppLovinMediationVerveAdapter', '3.8.1.0'
  pod 'AppLovinMediationVungleAdapter', '7.6.2.0'
  pod 'AppLovinMediationYandexAdapter', '7.17.0.0'
  # Level Play
  pod 'IronSourceAdMobAdapter', '5.3.0.0'
  pod 'IronSourceAppLovinAdapter', '5.3.0.0'
  pod 'IronSourceBidMachineAdapter', '5.7.0.0'
  pod 'IronSourceBigoAdapter', '5.1.0.0'
  pod 'IronSourceFacebookAdapter', '5.0.0.0'
  pod 'IronSourceFyberAdapter', '5.2.0.0'
  pod 'IronSourceInMobiAdapter', '5.3.0.0'
  pod 'IronSourceMintegralAdapter', '5.1.0.0'
  pod 'IronSourceMobileFuseAdapter', '5.0.0.0'
  pod 'IronSourceMolocoAdapter', '5.2.0.0'
  pod 'IronSourceMyTargetAdapter', '5.3.0.0'
  pod 'IronSourceOguryAdapter', '5.0.0.0'
  pod 'IronSourcePangleAdapter', '5.5.0.0'
  pod 'IronSourceSmaatoAdapter', '5.2.0.0'
  pod 'IronSourceUnityAdsAdapter', '5.2.0.0'
  pod 'IronSourceVerveAdapter', '5.5.0.0'
  pod 'IronSourceVungleAdapter', '5.3.0.0'
  # Appodeal
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
  pod 'AppodealGoogleAdMobAdapter', '12.13.0.0'
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
  # Bidon
  pod 'BidonAdapterAmazon', '5.3.2.0'
  pod 'BidonAdapterAppLovin', '13.5.1.0'
  pod 'BidonAdapterBidMachine', '3.7.1.1'
  pod 'BidonAdapterBigoAds', '5.0.0.0'
  pod 'BidonAdapterChartboost', '9.10.1.0'
  pod 'BidonAdapterDTExchange', '8.4.1.0'
  pod 'BidonAdapterInMobi', '11.1.0.0'
  pod 'BidonAdapterIronSource', '9.1.0.0.0'
  pod 'BidonAdapterMetaAudienceNetwork', '6.20.1.0'
  pod 'BidonAdapterMintegral', '7.7.9.0'
  pod 'BidonAdapterMobileFuse', '1.9.3.0'
  pod 'BidonAdapterMoloco', '4.1.0.0'
  pod 'BidonAdapterMyTarget', '5.36.2.0'
  pod 'BidonAdapterStartIo', '4.13.0.0'
  pod 'BidonAdapterTaurusX', '1.15.0.0'
  pod 'BidonAdapterUnityAds', '4.16.3.0'
  pod 'BidonAdapterVungle', '7.6.2.0'
  pod 'BidonAdapterYandex', '7.17.0.0'
  pod 'BidonAdapterZmaticoo', '2.2.0.0'
end`;

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
  return withDangerousMod(config, 'ios', (cfg) => {
    const podfilePath = path.join(cfg.modRequest.projectRoot, 'ios', 'Podfile');
    if (!fs.existsSync(podfilePath)) {
      return cfg; // no native project yet (e.g. config introspection)
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
    const nativeModulesIndex = podfile.search(/^\s*config = use_native_modules!.*$/m);
    if (nativeModulesIndex >= 0) {
      const lineEnd =
        nativeModulesIndex + podfile.slice(nativeModulesIndex).indexOf('\n') + 1;
      podfile =
        podfile.slice(0, lineEnd) +
        '  appodeal\n' +
        podfile.slice(lineEnd);
    }

    fs.writeFileSync(podfilePath, podfile);
    return cfg;
  });
}

function withAppodeal(config, props = {}) {
  config = withAppodealInfoPlist(config, props);
  config = withAppodealPodfile(config);
  return config;
}

module.exports = withAppodeal;
