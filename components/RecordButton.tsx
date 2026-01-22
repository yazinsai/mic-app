import { useEffect } from "react";
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRecorder } from "@/hooks/useRecorder";

interface RecordButtonProps {
  onRecordingComplete?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RecordButton({ onRecordingComplete }: RecordButtonProps) {
  const {
    state,
    duration,
    hasPermission,
    startRecording,
    stopRecording,
    isRecording,
    isSaving,
  } = useRecorder(onRecordingComplete);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, pulseScale, pulseOpacity]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePressIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startRecording();
  };

  const handlePressOut = async () => {
    if (isRecording) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      stopRecording();
    }
  };

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={[styles.button, styles.buttonDisabled]}>
          <Text style={styles.permissionText}>
            Microphone access required
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isRecording && (
        <Text style={styles.durationText}>{formatDuration(duration)}</Text>
      )}

      <View style={styles.buttonContainer}>
        <Animated.View style={[styles.pulseRing, pulseAnimatedStyle]} />

        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.button,
            isRecording && styles.buttonRecording,
            isSaving && styles.buttonSaving,
            pressed && !isRecording && styles.buttonPressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View
              style={[
                styles.innerCircle,
                isRecording && styles.innerCircleRecording,
              ]}
            />
          )}
        </Pressable>
      </View>

      <Text style={styles.instructionText}>
        {isSaving
          ? "Saving..."
          : isRecording
            ? "Release to stop"
            : "Hold to record"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#ef4444",
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#374151",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    borderColor: "#ef4444",
  },
  buttonRecording: {
    backgroundColor: "#dc2626",
    borderColor: "#ef4444",
  },
  buttonSaving: {
    backgroundColor: "#374151",
    borderColor: "#4b5563",
  },
  buttonDisabled: {
    backgroundColor: "#374151",
    borderColor: "#4b5563",
  },
  innerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ef4444",
  },
  innerCircleRecording: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  durationText: {
    fontSize: 48,
    fontWeight: "200",
    color: "#f9fafb",
    marginBottom: 24,
    fontVariant: ["tabular-nums"],
  },
  instructionText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 24,
  },
  permissionText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
