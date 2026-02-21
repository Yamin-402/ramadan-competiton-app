import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { TasksDesignVariant } from "../store/settings-store";
import { AppColors } from "../theme/colors";

interface PatternBackgroundProps {
  colors: AppColors;
  variant?: TasksDesignVariant;
}

export function PatternBackground({ colors, variant = "classic" }: PatternBackgroundProps) {
  if (variant === "ramadan_modern") {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#0a251b", "#123b2b", "#1d5a42", "#c5a14a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.bgOrb, styles.bgOrbTop]} />
        <View style={[styles.bgOrb, styles.bgOrbBottom]} />
        <View style={styles.bgStripeA} />
        <View style={styles.bgStripeB} />
      </View>
    );
  }

  if (variant === "modern") {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#eef3fb", "#e6edf8", "#dde7f6", "#cfdcf3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.bgModernGlow, styles.bgModernGlowTop]} />
        <View style={[styles.bgModernGlow, styles.bgModernGlowBottom]} />
        <View style={styles.bgModernStripeA} />
        <View style={styles.bgModernStripeB} />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[colors.background, colors.cardSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="geo" width={48} height={48} patternUnits="userSpaceOnUse">
            <Path d="M24 4L44 24L24 44L4 24Z" fill="none" stroke={colors.pattern} strokeWidth={1} />
            <Path d="M24 14L34 24L24 34L14 24Z" fill="none" stroke={colors.pattern} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#geo)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 216, 128, 0.16)",
  },
  bgOrbTop: {
    width: 260,
    height: 260,
    top: -90,
    right: -80,
  },
  bgOrbBottom: {
    width: 220,
    height: 220,
    bottom: -60,
    left: -70,
  },
  bgStripeA: {
    position: "absolute",
    width: 320,
    height: 120,
    top: 220,
    left: -110,
    transform: [{ rotate: "-20deg" }],
    backgroundColor: "rgba(246, 220, 156, 0.08)",
    borderRadius: 30,
  },
  bgStripeB: {
    position: "absolute",
    width: 280,
    height: 100,
    bottom: 180,
    right: -90,
    transform: [{ rotate: "-22deg" }],
    backgroundColor: "rgba(246, 220, 156, 0.07)",
    borderRadius: 26,
  },
  bgModernGlow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(67, 122, 255, 0.12)",
  },
  bgModernGlowTop: {
    width: 240,
    height: 240,
    top: -80,
    left: -60,
  },
  bgModernGlowBottom: {
    width: 220,
    height: 220,
    bottom: -70,
    right: -60,
  },
  bgModernStripeA: {
    position: "absolute",
    width: 320,
    height: 110,
    top: 180,
    right: -120,
    transform: [{ rotate: "-18deg" }],
    backgroundColor: "rgba(72, 118, 216, 0.08)",
    borderRadius: 24,
  },
  bgModernStripeB: {
    position: "absolute",
    width: 280,
    height: 100,
    bottom: 220,
    left: -100,
    transform: [{ rotate: "-16deg" }],
    backgroundColor: "rgba(72, 118, 216, 0.07)",
    borderRadius: 24,
  },
});
