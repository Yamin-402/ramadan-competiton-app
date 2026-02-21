import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/use-app-theme";

interface TopToastProps {
  message: string;
  tone?: "success" | "error";
}

export function TopToast({ message, tone = "success" }: TopToastProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isSuccess = tone === "success";

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          top: insets.top + 58,
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            borderColor: isSuccess ? colors.success : colors.danger,
            backgroundColor: isSuccess ? "#1f3b2f" : "#4a1f24",
          },
        ]}
      >
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  toast: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 220,
    maxWidth: "100%",
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
