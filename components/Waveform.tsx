import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "@/constants/Colors";

interface WaveformProps {
  metering: number;
  isActive: boolean;
  barCount?: number;
  height?: number;
  color?: string;
}

function normalizeMetering(metering: number): number {
  const min = -60;
  const max = 0;
  const clamped = Math.max(min, Math.min(max, metering));
  return (clamped - min) / (max - min);
}

function WaveformBar({
  metering,
  index,
  totalBars,
  isActive,
  height,
  color,
}: {
  metering: number;
  index: number;
  totalBars: number;
  isActive: boolean;
  height: number;
  color: string;
}) {
  const barHeight = useSharedValue(0.08);

  useEffect(() => {
    if (!isActive) {
      barHeight.value = withTiming(0.08, { duration: 300 });
      return;
    }

    const normalized = normalizeMetering(metering);

    // Create variation across bars - center bars are taller, edges shorter
    const centerDistance = Math.abs(index - totalBars / 2) / (totalBars / 2);
    const positionFactor = 1 - centerDistance * 0.5;

    // Add some randomness for natural look
    const randomFactor = 0.7 + Math.random() * 0.6;

    // Calculate final height
    const targetHeight = Math.max(0.08, normalized * positionFactor * randomFactor);

    barHeight.value = withSpring(targetHeight, {
      damping: 12,
      stiffness: 200,
      mass: 0.5,
    });
  }, [metering, isActive, index, totalBars, barHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: barHeight.value * height,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export function Waveform({
  metering,
  isActive,
  barCount = 40,
  height = 120,
  color = colors.primary,
}: WaveformProps) {
  const bars = [];
  for (let i = 0; i < barCount; i++) {
    bars.push(
      <WaveformBar
        key={i}
        metering={metering}
        index={i}
        totalBars={barCount}
        isActive={isActive}
        height={height}
        color={color}
      />
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {bars}
    </View>
  );
}

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
  color = colors.primary,
}: MiniWaveformProps) {
  const barCount = Math.floor(width / 4);

  const bars = [];
  for (let i = 0; i < barCount; i++) {
    const pseudoRandom = Math.sin(seed * 100 + i * 0.8) * 0.5 + 0.5;
    const barHeight = 0.2 + pseudoRandom * 0.8;
    bars.push(
      <View
        key={i}
        style={[
          styles.miniStaticBar,
          {
            backgroundColor: color,
            height: barHeight * height,
            opacity: 0.7 + pseudoRandom * 0.3,
          },
        ]}
      />
    );
  }

  return (
    <View style={[styles.miniStaticContainer, { width, height }]}>
      {bars}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
  miniStaticContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  miniStaticBar: {
    width: 2,
    borderRadius: 1,
    minHeight: 2,
  },
});
