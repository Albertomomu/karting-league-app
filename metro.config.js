// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_conditionNames = ["require"];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios") {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ["browser", "default", "require"] },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
