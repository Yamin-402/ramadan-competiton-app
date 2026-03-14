import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
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

  if (variant === "ramadan_nights") {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#09071a", "#130d2d", "#1f1450", "#2b1a69"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.bgNightGlow, styles.bgNightGlowTop]} />
        <View style={[styles.bgNightGlow, styles.bgNightGlowBottom]} />
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Circle cx="88" cy="94" r="34" fill="rgba(255, 231, 178, 0.20)" />
          <Circle cx="102" cy="86" r="34" fill="#130d2d" />
          <Circle cx="290" cy="208" r="28" fill="rgba(255, 231, 178, 0.17)" />
          <Circle cx="301" cy="201" r="28" fill="#1f1450" />
          <Circle cx="170" cy="440" r="22" fill="rgba(255, 231, 178, 0.14)" />
          <Circle cx="180" cy="435" r="22" fill="#2b1a69" />
          <Circle cx="54" cy="240" r="2.1" fill="rgba(255,255,255,0.48)" />
          <Circle cx="142" cy="188" r="1.8" fill="rgba(255,255,255,0.52)" />
          <Circle cx="322" cy="124" r="1.9" fill="rgba(255,255,255,0.4)" />
          <Circle cx="286" cy="360" r="1.7" fill="rgba(255,255,255,0.45)" />
          <Circle cx="100" cy="540" r="2.1" fill="rgba(255,255,255,0.36)" />
          <Circle cx="256" cy="600" r="1.8" fill="rgba(255,255,255,0.36)" />
        </Svg>
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
  bgNightGlow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(173, 132, 255, 0.18)",
  },
  bgNightGlowTop: {
    width: 260,
    height: 260,
    top: -110,
    left: -90,
  },
  bgNightGlowBottom: {
    width: 240,
    height: 240,
    bottom: -90,
    right: -80,
  },
});
