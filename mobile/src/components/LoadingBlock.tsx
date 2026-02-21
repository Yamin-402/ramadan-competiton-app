import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";

interface LoadingBlockProps {
  label?: string;
}

export function LoadingBlock({ label = "Loading..." }: LoadingBlockProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.gold} />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  label: {
    fontSize: 14,
  },
});
