import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { notificationsApi } from "../api/endpoints/notifications.api";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";
import { useAuthStore } from "../store/auth-store";
import { useNotificationsStore } from "../store/notifications-store";
import { NotificationRecipient } from "../types/domain";

function isAnnouncement(row: NotificationRecipient): boolean {
  return Boolean(row.campaign?.filters?.isAnnouncement);
}

export function GlobalAnnouncementPopup() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const userId = useAuthStore((state) => state.user?.id);
  const setUnreadCount = useNotificationsStore((state) => state.setUnreadCount);

  const [current, setCurrent] = useState<NotificationRecipient | null>(null);
  const [busy, setBusy] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Record<number, true>>({});

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setCurrent(null);
      setUnreadCount(0);
      return () => {
        mounted = false;
      };
    }

    const load = async () => {
      try {
        const rows = await notificationsApi.listMine(60);
        if (!mounted) {
          return;
        }

        setUnreadCount(rows.filter((row) => !row.readAt).length);
        const next = rows.find((row) => !row.readAt && isAnnouncement(row) && !hiddenIds[row.id]) || null;
        setCurrent(next);
      } catch {
        // ignore background polling errors
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, 45000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [hiddenIds, setUnreadCount, userId]);

  const dismiss = async () => {
    if (!current || busy) {
      return;
    }

    setBusy(true);
    try {
      await notificationsApi.markRead(current.id);
      setCurrent(null);
    } catch {
      // fallback: hide locally for this app session to avoid blocking the user
      setHiddenIds((prev) => ({ ...prev, [current.id]: true }));
      setCurrent(null);
    } finally {
      setBusy(false);
    }
  };

  const textAlign = useMemo(() => (isArabic ? "right" : "left"), [isArabic]);

  return (
    <Modal transparent visible={Boolean(current)} animationType="fade" onRequestClose={() => void dismiss()}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => void dismiss()} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerText, { color: colors.gold }]}>{t("announcement.title")}</Text>
            <Pressable onPress={() => void dismiss()} hitSlop={10}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{current?.campaign.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary, textAlign }]}>{current?.campaign.body}</Text>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => void dismiss()}
              style={[styles.dismissButton, { backgroundColor: colors.gold }]}
            >
              <Text style={styles.dismissButtonText}>{t("announcement.dismiss")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionsRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  dismissButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dismissButtonText: {
    color: "#1a1407",
    fontWeight: "800",
    fontSize: 12,
  },
});
