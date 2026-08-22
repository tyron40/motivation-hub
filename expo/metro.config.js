const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = withRorkMetro(getDefaultConfig(__dirname));

// react-native-appodeal imports native-only codegen modules
// (codegenNativeComponent) that cannot resolve on web. It is only ever used
// on native (AppodealManager guards requires with Platform.OS), so replace it
// with an empty module on web. require('react-native-appodeal') then yields
// undefined and AppodealManager degrades to its no-op path.
const NATIVE_ONLY_PACKAGES = ["react-native-appodeal"];

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === "web" &&
    NATIVE_ONLY_PACKAGES.some(
      (pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`)
    )
  ) {
    return { type: "empty" };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
