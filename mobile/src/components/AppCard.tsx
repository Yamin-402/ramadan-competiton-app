import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";
import { useSettingsStore } from "../store/settings-store";

interface AppCardProps extends PropsWithChildren {
  style?: ViewStyle;
}

export function AppCard({ children, style }: AppCardProps) {
  const { colors } = useAppTheme();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const isNightVariant = variant === "ramadan_nights";

  return (
    <View
      style={[
        styles.card,
        isNightVariant ? styles.nightCard : null,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: isNightVariant ? "#0f0a25" : colors.greenDeep,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
    gap: 8,
  },
  nightCard: {
    borderRadius: 18,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
});
