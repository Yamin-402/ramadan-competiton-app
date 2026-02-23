import { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/use-app-theme";
import { useSettingsStore } from "../store/settings-store";
import { PatternBackground } from "./PatternBackground";

interface ScreenContainerProps extends PropsWithChildren {
  scroll?: boolean;
  useDefaultBackground?: boolean;
  customBackground?: ReactNode;
  fixedOverlay?: ReactNode;
  safeAreaEdges?: Edge[];
  overlayTopSpacing?: number;
}

const BASE_CONTENT_PADDING = 16;

export function ScreenContainer({
  children,
  scroll = true,
  useDefaultBackground = true,
  customBackground,
  fixedOverlay,
  safeAreaEdges = ["left", "right"],
  overlayTopSpacing = 0,
}: ScreenContainerProps) {
  const { colors } = useAppTheme();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const contentPaddingTop = BASE_CONTENT_PADDING + Math.max(0, overlayTopSpacing);
  const contentPaddingBottom = BASE_CONTENT_PADDING;

  return (
    <View style={styles.root}>
      {useDefaultBackground ? <PatternBackground colors={colors} variant={variant} /> : null}
      {customBackground}
      <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: contentPaddingTop },
              { paddingBottom: contentPaddingBottom },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.content,
              { paddingTop: contentPaddingTop },
              { paddingBottom: contentPaddingBottom },
            ]}
          >
            {children}
          </View>
        )}
      </SafeAreaView>
      {fixedOverlay ? <View pointerEvents="box-none" style={styles.fixedOverlay}>{fixedOverlay}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: BASE_CONTENT_PADDING,
    gap: 12,
  },
  fixedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
});
