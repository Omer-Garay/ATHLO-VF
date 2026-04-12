// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Soporte para web: resolver react-native-svg a react-native-svg-web
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;
