import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";
import { useSettingsStore } from "../store/settings-store";

type ButtonVariant = "primary" | "ghost" | "danger";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  labelColor?: string;
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  style,
  labelColor,
}: AppButtonProps) {
  const { colors } = useAppTheme();
  const variantTheme = useSettingsStore((state) => state.tasksDesignVariant);
  const isNightVariant = variantTheme === "ramadan_nights";

  const variantStyle = {
    primary: {
      backgroundColor: colors.gold,
      borderColor: colors.goldMuted,
      textColor: isNightVariant ? "#251b06" : "#1d1809",
    },
    ghost: {
      backgroundColor: isNightVariant ? "rgba(242, 199, 90, 0.12)" : "transparent",
      borderColor: colors.border,
      textColor: colors.textPrimary,
    },
    danger: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
      textColor: "#fff",
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: labelColor || variantStyle.textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
});
