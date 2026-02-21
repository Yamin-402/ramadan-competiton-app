import { ExpoConfig } from "expo/config";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

const config: ExpoConfig = {
  name: "Ramadan Competition",
  slug: "ramadan-competition-mobile",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
  },
  android: {},
  web: {
    bundler: "metro",
  },
  extra: apiBaseUrl ? { apiBaseUrl } : {},
};

export default config;
