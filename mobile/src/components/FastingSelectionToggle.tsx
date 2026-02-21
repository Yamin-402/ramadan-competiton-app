import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";
import { FastingSelection } from "../features/tasks/fasting-selection";

interface FastingSelectionToggleProps {
  value: FastingSelection;
  onChange: (value: FastingSelection) => void;
}

export function FastingSelectionToggle({ value, onChange }: FastingSelectionToggleProps) {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary, textAlign: isArabic ? "right" : "left" }]}>
        {t("tasks.timing")}
      </Text>
      <View style={[styles.segmentRow, { borderColor: colors.border }]}>
        <Pressable
          onPress={() => onChange("FASTING")}
          style={[
            styles.segment,
            {
              backgroundColor: value === "FASTING" ? colors.gold : colors.cardSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.segmentLabel,
              {
                color: value === "FASTING" ? "#1a1204" : colors.textPrimary,
              },
            ]}
          >
            {t("tasks.fasting")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChange("IFTAR")}
          style={[
            styles.segment,
            {
              backgroundColor: value === "IFTAR" ? colors.gold : colors.cardSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.segmentLabel,
              {
                color: value === "IFTAR" ? "#1a1204" : colors.textPrimary,
              },
            ]}
          >
            {t("tasks.iftar")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  segmentRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    gap: 6,
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
});
