import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const { colors } = useAppTheme();
  const { isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";

  return (
    <View style={[styles.root, { borderColor: colors.border, backgroundColor: colors.cardSoft }]}>
      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
