import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";

interface AppTextInputProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words";
}

export function AppTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: AppTextInputProps) {
  const { colors } = useAppTheme();
  const { isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary, textAlign }]}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.textPrimary,
            minHeight: multiline ? 100 : 46,
            textAlignVertical: multiline ? "top" : "center",
            textAlign,
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
