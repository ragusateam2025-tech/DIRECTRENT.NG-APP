module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its Babel plugin into react-native-worklets. The older
    // 'react-native-reanimated/plugin' path still exists in node_modules but is
    // the v3 location — using it here fails at runtime with an opaque worklet
    // error rather than at build time.
    //
    // This must stay LAST in the plugins array.
    plugins: ['react-native-worklets/plugin'],
  };
};
