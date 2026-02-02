import { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useThemeColors";

interface WaveformProps {
  metering: number;
  isActive: boolean;
  barCount?: number;
  height?: number;
  color?: string;
}

function normalizeMetering(metering: number): number {
  const min = -50;
  const max = -5;
  const clamped = Math.max(min, Math.min(max, metering));
  return (clamped - min) / (max - min);
}

/**
 * AnimatedBar - A single vertical bar that responds to audio level
 * Uses spring animation for natural, organic movement
 */
function AnimatedBar({
  targetHeight,
  minHeight,
  maxHeight,
  width,
  color,
}: {
  targetHeight: number;
  minHeight: number;
  maxHeight: number;
  width: number;
  color: string;
}) {
  const height = useSharedValue(minHeight);

  useEffect(() => {
    height.value = withSpring(targetHeight, {
      damping: 12,
      stiffness: 180,
      mass: 0.4,
    });
  }, [targetHeight, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width,
          minHeight,
          maxHeight,
          borderRadius: width / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Waveform - Real-time audio level visualization
 * All bars respond to current audio level with natural variation
 * Creates a symmetric, organic waveform like professional audio apps
 */
export function Waveform({
  metering,
  isActive,
  barCount = 32,
  height = 140,
  color,
}: WaveformProps) {
  const colors = useColors();
  const barColor = color ?? colors.primary;
  const { width: screenWidth } = useWindowDimensions();

  // Bar configuration
  const barWidth = 4;
  const barGap = 3;
  const minBarHeight = 4;
  const maxBarHeight = height * 0.85;

  // Calculate how many bars can fit
  const availableWidth = Math.min(screenWidth - 64, 340);
  const actualBarCount = Math.min(barCount, Math.floor(availableWidth / (barWidth + barGap)));

  // Generate deterministic variation pattern for each bar position
  // This creates a natural-looking waveform shape
  const barVariations = useMemo(() => {
    const variations: number[] = [];
    const center = actualBarCount / 2;

    for (let i = 0; i < actualBarCount; i++) {
      // Distance from center (0-1)
      const distFromCenter = Math.abs(i - center) / center;

      // Base envelope - bars are taller in the center
      const envelope = 1 - Math.pow(distFromCenter, 1.5) * 0.6;

      // Add subtle pseudo-random variation for organic feel
      const noise = Math.sin(i * 2.7) * 0.15 + Math.sin(i * 4.3) * 0.1;

      variations.push(Math.max(0.2, Math.min(1, envelope + noise)));
    }
    return variations;
  }, [actualBarCount]);

  // Ref to track smoothed level for natural decay
  const smoothedLevelRef = useRef(0);

  // Smooth the metering value
  const normalized = normalizeMetering(metering);
  const targetLevel = isActive ? normalized : 0;

  // Apply smoothing - fast attack, slower decay
  const attackSpeed = 0.7;
  const decaySpeed = 0.15;

  if (targetLevel > smoothedLevelRef.current) {
    smoothedLevelRef.current = smoothedLevelRef.current + (targetLevel - smoothedLevelRef.current) * attackSpeed;
  } else {
    smoothedLevelRef.current = smoothedLevelRef.current + (targetLevel - smoothedLevelRef.current) * decaySpeed;
  }

  const currentLevel = smoothedLevelRef.current;

  return (
    <View style={[styles.container, { height }]}>
      <View style={[styles.waveformContainer, { gap: barGap }]}>
        {barVariations.map((variation, index) => {
          // Calculate target height based on current level and bar's variation
          const barLevel = currentLevel * variation;
          const targetHeight = minBarHeight + barLevel * (maxBarHeight - minBarHeight);

          return (
            <AnimatedBar
              key={index}
              targetHeight={Math.max(minBarHeight, targetHeight)}
              minHeight={minBarHeight}
              maxHeight={maxBarHeight}
              width={barWidth}
              color={barColor}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * MiniWaveform - Static dotted waveform for list items and compact views
 */
interface MiniWaveformProps {
  seed?: number;
  width?: number;
  height?: number;
  color?: string;
}

export function MiniWaveform({
  seed = 0,
  width = 100,
  height = 24,
  color,
}: MiniWaveformProps) {
  const colors = useColors();
  const dotColor = color ?? colors.primary;

  const dotSize = 4;
  const gap = 6;
  const dotCount = Math.floor(width / (dotSize + gap));

  const dots = useMemo(() => {
    const result: { size: number; opacity: number }[] = [];
    for (let i = 0; i < dotCount; i++) {
      // Pseudo-random but deterministic pattern based on seed
      const pseudoRandom = Math.sin(seed * 100 + i * 1.3) * 0.5 + 0.5;
      const variation = Math.sin(seed * 50 + i * 0.7) * 0.5 + 0.5;

      result.push({
        size: dotSize * (0.6 + pseudoRandom * 0.8),
        opacity: 0.3 + variation * 0.5,
      });
    }
    return result;
  }, [seed, dotCount, dotSize]);

  return (
    <View style={[styles.miniContainer, { width, height }]}>
      {dots.map((dot, i) => (
        <View
          key={i}
          style={[
            styles.miniDot,
            {
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              backgroundColor: dotColor,
              opacity: dot.opacity,
              marginHorizontal: gap / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    // Vertical bar - styling applied inline
  },
  miniContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  miniDot: {
    // Mini dot styling applied inline
  },
});
