import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { activitiesApi } from "../../../api/endpoints/activities.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { Activity } from "../../../types/domain";
import { formatDateTime, formatPoints } from "../../../utils/format";

export function ActivityLogScreen() {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Activity[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activitiesApi.listMine(100);
      setRows(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load activity log"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  return (
    <ScreenContainer>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No activities yet" />
      ) : (
        rows.map((row) => (
          <AppCard key={row.id}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {row.task?.title || row.type}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Effective points: {formatPoints(row.effectivePoints)}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatDateTime(row.occurredAt)}
            </Text>
            {row.note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{row.note}</Text> : null}
          </AppCard>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
  note: {
    fontSize: 13,
    fontStyle: "italic",
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
