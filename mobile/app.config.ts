import { ExpoConfig } from "expo/config";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

const config: ExpoConfig = {
  name: "Ramadan Competition",
  slug: "ramadan-competition-mobile",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  icon: "./assets/images/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yamin.ramadancompetition",
  },
  android: {
    package: "com.yamin.ramadancompetition",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#0F3A2C",
    },
  },
  web: {
    bundler: "metro",
  },
  extra: apiBaseUrl ? { apiBaseUrl } : {},
};

export default config;
