module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated 4 + worklets — 반드시 마지막 plugin 으로
      'react-native-worklets/plugin',
    ],
  };
};
