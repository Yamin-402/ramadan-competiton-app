import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Web-compatible storage adapter for Zustand persist middleware
 * Uses localStorage on web, AsyncStorage on native
 */
export const createStorage = () => {
  if (Platform.OS === "web") {
    return {
      getItem: async (name: string) => {
        try {
          return localStorage.getItem(name) || null;
        } catch (e) {
          console.warn("localStorage getItem error:", e);
          return null;
        }
      },
      setItem: async (name: string, value: string) => {
        try {
          localStorage.setItem(name, value);
        } catch (e) {
          console.warn("localStorage setItem error:", e);
        }
      },
      removeItem: async (name: string) => {
        try {
          localStorage.removeItem(name);
        } catch (e) {
          console.warn("localStorage removeItem error:", e);
        }
      },
    };
  }

  // Native/Expo: use AsyncStorage
  return {
    getItem: async (name: string) => {
      try {
        return await AsyncStorage.getItem(name);
      } catch (e) {
        console.warn("AsyncStorage getItem error:", e);
        return null;
      }
    },
    setItem: async (name: string, value: string) => {
      try {
        await AsyncStorage.setItem(name, value);
      } catch (e) {
        console.warn("AsyncStorage setItem error:", e);
      }
    },
    removeItem: async (name: string) => {
      try {
        await AsyncStorage.removeItem(name);
      } catch (e) {
        console.warn("AsyncStorage removeItem error:", e);
      }
    },
  };
};
