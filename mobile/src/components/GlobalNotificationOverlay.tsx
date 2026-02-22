import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { activitiesApi } from "../api/endpoints/activities.api";
import { navigationRef } from "../app/navigation/navigationRef";
import { useI18n } from "../hooks/use-i18n";
import { useAppTheme } from "../hooks/use-app-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/auth-store";
import { useSettingsStore } from "../store/settings-store";
import { pointsEvents } from "../events/points-events";
import { getLayoutPalette } from "../theme/layout-palette";
import { formatPoints } from "../utils/format";
import { getRamadanDayNumber } from "../utils/ramadan";
import { NotificationBell } from "./NotificationBell";

export function GlobalNotificationOverlay() {
  const { colors, mode } = useAppTheme();
  const { t, isArabic } = useI18n();
  const userId = useAuthStore((state) => state.user?.id);
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const insets = useSafeAreaInsets();
  const [points, setPoints] = useState<number>(0);
  const [activeRouteName, setActiveRouteName] = useState<string | null>(null);
  const palette = getLayoutPalette(variant, colors, mode);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setPoints(0);
      return () => {
        mounted = false;
      };
    }

    const loadPoints = async () => {
      try {
        const rows = await activitiesApi.listMine(500);
        const sum = rows.reduce((acc, row) => acc + Number(row.effectivePoints || 0), 0);
        if (mounted) {
          setPoints(sum);
        }
      } catch {
        if (mounted) {
          setPoints(0);
        }
      }
    };

    void loadPoints();
    const unsubscribe = pointsEvents.subscribe(() => {
      void loadPoints();
    });

    const timer = setInterval(() => {
      void loadPoints();
    }, 45000);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(timer);
    };
  }, [userId]);

  useEffect(() => {
    const readRouteName = () => {
      if (!navigationRef.isReady()) {
        return null;
      }
      return navigationRef.getCurrentRoute()?.name || null;
    };

    const sync = () => {
      setActiveRouteName(readRouteName());
    };

    sync();
    const unsubscribe = navigationRef.addListener("state", sync);
    return unsubscribe;
  }, []);

  if (!userId) {
    return null;
  }

  const isMoreStackRoute =
    activeRouteName !== null &&
    [
      "MoreMenu",
      "Leaderboard",
      "Streaks",
      "Notifications",
      "Money",
      "ActivityStats",
      "ActivityHistory",
      "Profile",
      "UserProfile",
      "Guide",
      "Onboarding",
    ].includes(activeRouteName);

  if (isMoreStackRoute) {
    return null;
  }

  const ramadanDay = getRamadanDayNumber(new Date());

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          top: insets.top + 6,
          right: isArabic ? undefined : 12,
          left: isArabic ? 12 : undefined,
        },
      ]}
    >
      <View style={[styles.row, { backgroundColor: palette.topNavBackground }]}>
          <View style={styles.infoBlock}>
          <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>{t("overlay.points")}</Text>
          <Text style={[styles.pillValue, { color: palette.topNavText }]}>{formatPoints(points)}</Text>
          </View>
          <View style={styles.infoBlock}>
          <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>{t("overlay.ramadan")}</Text>
          <Text style={[styles.pillValue, { color: palette.topNavText }]}>
            {ramadanDay > 0 ? `${t("overlay.day")} ${ramadanDay}` : t("overlay.beforeStart")}
          </Text>
          </View>
          <View style={styles.bellWrap}>
            <NotificationBell />
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 50,
    elevation: 50,
  },
  row: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    backgroundColor: "rgba(15, 34, 26, 0.76)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  infoBlock: {
    minWidth: 54,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  pillValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  bellWrap: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
