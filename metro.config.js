// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Packages that depend on native modules (WebRTC) and must not be evaluated
// on the web platform. Metro will resolve these to an empty shim instead.
const nativeOnlyPackages = [
  '@livekit/react-native',
  '@livekit/react-native-webrtc',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeOnlyPackages.includes(moduleName)) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
