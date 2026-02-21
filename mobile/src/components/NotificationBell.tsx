import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { notificationsApi } from "../api/endpoints/notifications.api";
import { navigateToNotifications } from "../app/navigation/navigationRef";
import { useAppTheme } from "../hooks/use-app-theme";
import { useAuthStore } from "../store/auth-store";
import { useNotificationsStore } from "../store/notifications-store";
import { useSettingsStore } from "../store/settings-store";
import { getLayoutPalette } from "../theme/layout-palette";

export function NotificationBell() {
  const { colors, mode } = useAppTheme();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const palette = getLayoutPalette(variant, colors, mode);
  const userId = useAuthStore((state) => state.user?.id);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationsStore((state) => state.setUnreadCount);

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await notificationsApi.unreadCount();
      setUnreadCount(count);
    } catch {
      // Ignore silent polling errors in header badge.
    }
  }, [setUnreadCount, userId]);

  useEffect(() => {
    void refreshUnread();
    const timer = setInterval(() => {
      void refreshUnread();
    }, 45000);

    return () => clearInterval(timer);
  }, [refreshUnread]);

  return (
    <Pressable
      onPress={navigateToNotifications}
      style={styles.pressable}
      hitSlop={10}
    >
      <Ionicons name="notifications-outline" size={24} color={palette.topNavText} />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: 1,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
