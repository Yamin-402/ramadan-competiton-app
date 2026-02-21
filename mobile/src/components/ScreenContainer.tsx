import { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";
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
  withTabBarSpacing?: boolean;
  overlayTopSpacing?: number;
}

const BASE_CONTENT_PADDING = 16;

export function ScreenContainer({
  children,
  scroll = true,
  useDefaultBackground = true,
  customBackground,
  fixedOverlay,
  safeAreaEdges = ["top", "left", "right", "bottom"],
  withTabBarSpacing,
  overlayTopSpacing = 0,
}: ScreenContainerProps) {
  const { colors } = useAppTheme();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const hasTabParent = (() => {
    let parent = navigation.getParent();
    while (parent) {
      if (parent.getState().type === "tab") {
        return true;
      }
      parent = parent.getParent();
    }
    return false;
  })();
  const applyTabBarSpacing = withTabBarSpacing ?? hasTabParent;
  const contentPaddingTop = BASE_CONTENT_PADDING + Math.max(0, overlayTopSpacing);

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
              applyTabBarSpacing ? styles.contentWithTabBarSpacing : null,
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
              applyTabBarSpacing ? styles.contentWithTabBarSpacing : null,
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
  contentWithTabBarSpacing: {
    paddingBottom: 98,
  },
  fixedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
});
