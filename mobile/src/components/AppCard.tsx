import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";

interface AppCardProps extends PropsWithChildren {
  style?: ViewStyle;
}

export function AppCard({ children, style }: AppCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.greenDeep,
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
});
