import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { notificationsApi } from "../../../api/endpoints/notifications.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useNotificationsStore } from "../../../store/notifications-store";
import { useSettingsStore } from "../../../store/settings-store";
import { NotificationRecipient } from "../../../types/domain";
import { formatDateTime } from "../../../utils/format";

export function NotificationsScreen() {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const setUnreadCount = useNotificationsStore((state) => state.setUnreadCount);

  const [rows, setRows] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsApi.listMine(100);
      setRows(data);
      const unread = data.filter((row) => !row.readAt).length;
      setUnreadCount(unread);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load notifications"));
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const markAsRead = async (id: number) => {
    try {
      const updated = await notificationsApi.markRead(id);
      setRows((prev) => {
        const next = prev.map((item) => (item.id === updated.id ? updated : item));
        setUnreadCount(next.filter((item) => !item.readAt).length);
        return next;
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not mark notification as read"));
    }
  };

  const isModernVariant = tasksDesignVariant === "modern";
  const isRamadanVariant =
    tasksDesignVariant === "ramadan_modern" || tasksDesignVariant === "ramadan_nights";
  const isNightVariant = tasksDesignVariant === "ramadan_nights";
  const variantCardStyle = isModernVariant
    ? { backgroundColor: "#f8fbff", borderColor: "#d7dfec" }
    : isNightVariant
      ? { backgroundColor: "#1c1642", borderColor: "#5d4a8f" }
    : isRamadanVariant
      ? { backgroundColor: "#fff8e7", borderColor: "#ceb983" }
      : undefined;

  return (

    
    <ScreenContainer>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title={t("notifications.empty")} />
      ) : (
        rows.map((item) => {
          const unread = !item.readAt;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (unread) {
                  void markAsRead(item.id);
                }
              }}
            >
              <AppCard
                style={{
                  ...(variantCardStyle || {}),
                  borderColor: unread ? colors.gold : (variantCardStyle?.borderColor || colors.border),
                }}
              >
                <Text style={[styles.title, { color: colors.textPrimary }]}>{item.campaign.title}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{item.campaign.body}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {formatDateTime(item.createdAt)} | {unread ? t("common.unread") : t("common.read")}
                </Text>
              </AppCard>
            </Pressable>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
