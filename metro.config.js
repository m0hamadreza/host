const { withModuleFederation } = require('@module-federation/metro');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {};

module.exports = withModuleFederation(
  mergeConfig(getDefaultConfig(__dirname), config),
  {
    // Module Federation configuration follows the same format as documented at:
    // https://module-federation.io/configure/index.html
    // Note: Some features might not be available in React Native environment
    name: 'host',
    
    dts: true,
    // Note: do NOT add an `exposes` key to a pure host. The plugin treats any
    // present (even empty) `exposes` object as truthy and classifies the app as
    // a remote (isHost = !exposes), which swaps in the MF getDevServer and fails
    // at runtime with "Cannot determine dev server URL for host remote".
    remotes: {
      'mini': 'mini@http://192.168.1.188:8082/mf-manifest.json',
    },
    shared: {
      // Host applications should set eager: true for all the shared dependencies
      react: {
        singleton: true,
        eager: true,
        requiredVersion: '19.2.3',
        version: '19.2.3',
      },
      'react-native': {
        singleton: true,
        eager: true,
        requiredVersion: '0.86.0',
        version: '0.86.0',
      },
    },
  },
  {
    // These experimental flags have to be enabled in order to patch older packages
    // Can be omitted if your project is using supported React Native and Metro versions
    flags: {
      // Enable patching HMR Client from React Native
      unstable_patchHMRClient: true,
      // Enable patching React Native CLI
      unstable_patchInitializeCore: false,
      // Enable patching runtime require from Metro
      unstable_patchRuntimeRequire: true,
    },
  }
);