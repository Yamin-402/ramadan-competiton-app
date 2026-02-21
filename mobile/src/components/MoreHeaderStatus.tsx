import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { activitiesApi } from "../api/endpoints/activities.api";
import { useI18n } from "../hooks/use-i18n";
import { useAppTheme } from "../hooks/use-app-theme";
import { useAuthStore } from "../store/auth-store";
import { useSettingsStore } from "../store/settings-store";
import { getLayoutPalette } from "../theme/layout-palette";
import { formatPoints } from "../utils/format";
import { getRamadanDayNumber } from "../utils/ramadan";
import { NotificationBell } from "./NotificationBell";

export function MoreHeaderStatus() {
  const { colors, mode } = useAppTheme();
  const { t } = useI18n();
  const userId = useAuthStore((state) => state.user?.id);
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const [points, setPoints] = useState<number>(0);
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
    const timer = setInterval(() => {
      void loadPoints();
    }, 45000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [userId]);

  const ramadanDay = getRamadanDayNumber(new Date());

  return (
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  infoBlock: {
    minWidth: 52,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: "600",
  },
  pillValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  bellWrap: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
