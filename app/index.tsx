import { View, StyleSheet, SafeAreaView, Pressable, Text, TextInput } from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import { RecordingOverlay } from "@/components/RecordingOverlay";
import { QueueStatus } from "@/components/QueueStatus";
import { RecordingsList } from "@/components/RecordingsList";
import { useQueue } from "@/hooks/useQueue";
import { useRecorder } from "@/hooks/useRecorder";
import { colors, spacing, typography, radii, shadows } from "@/constants/Colors";

export default function HomeScreen() {
  const {
    recordings,
    pendingCount,
    failedCount,
    triggerProcessing,
    retry,
    remove,
    share,
  } = useQueue();

  const {
    duration,
    hasPermission,
    metering,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    isRecording,
    isPaused,
    isSaving,
    isActive,
  } = useRecorder(() => {
    triggerProcessing();
  });

  const handleStartRecording = async () => {
    if (hasPermission === false) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startRecording();
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <View style={styles.searchCircle} />
            <View style={styles.searchHandle} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search your recordings"
            placeholderTextColor={colors.textMuted}
            editable={false}
          />
        </View>

        <Link href="/settings" asChild>
          <Pressable style={styles.menuButton}>
            <View style={styles.menuDots}>
              <View style={styles.menuDot} />
              <View style={styles.menuDot} />
              <View style={styles.menuDot} />
            </View>
          </Pressable>
        </Link>
      </View>

      {(pendingCount > 0 || failedCount > 0) && (
        <View style={styles.statusBar}>
          <QueueStatus pendingCount={pendingCount} failedCount={failedCount} />
        </View>
      )}

      <View style={styles.content}>
        <RecordingsList
          recordings={recordings}
          onRetry={retry}
          onDelete={remove}
          onShare={share}
        />
      </View>

      <View style={styles.fabContainer}>
        <Pressable
          onPress={handleStartRecording}
          disabled={hasPermission === false}
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
            hasPermission === false && styles.fabDisabled,
          ]}
        >
          <View style={styles.fabInner} />
        </Pressable>
      </View>

      <RecordingOverlay
        isVisible={isActive || isSaving}
        duration={duration}
        metering={metering}
        isRecording={isRecording}
        isPaused={isPaused}
        isSaving={isSaving}
        onPauseResume={handlePauseResume}
        onStop={stopRecording}
        onDelete={cancelRecording}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  searchIcon: {
    width: 18,
    height: 18,
    position: "relative",
  },
  searchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  searchHandle: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 6,
    height: 2,
    backgroundColor: colors.textMuted,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.base,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  menuDots: {
    gap: 4,
  },
  menuDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
  },
  statusBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  fabContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.backgroundElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    borderColor: colors.border,
    ...shadows.md,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
    borderColor: colors.error,
  },
  fabDisabled: {
    opacity: 0.5,
  },
  fabInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
  },
});
