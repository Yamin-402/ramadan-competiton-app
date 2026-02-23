import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";

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

  const variantStyle = {
    primary: {
      backgroundColor: colors.gold,
      borderColor: colors.goldMuted,
      textColor: "#1d1809",
    },
    ghost: {
      backgroundColor: "transparent",
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
