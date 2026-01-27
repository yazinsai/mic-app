import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { spacing, typography, radii } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColors";

interface QueueStatusProps {
  pendingCount: number;
  failedCount: number;
  onPress?: () => void;
}

export function QueueStatus({
  pendingCount,
  failedCount,
  onPress,
}: QueueStatusProps) {
  const colors = useColors();
  const { isOnline } = useNetworkStatus();

  if (pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {!isOnline && (
        <View style={[styles.offlineBadge, { backgroundColor: colors.warning }]}>
          <Text style={[styles.offlineText, { color: colors.white }]}>Offline</Text>
        </View>
      )}

      {pendingCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.white }]}>
            {pendingCount} processing
          </Text>
        </View>
      )}

      {failedCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={[styles.badgeText, { color: colors.white }]}>
            {failedCount} failed
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.xl,
  },
  offlineBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.xl,
  },
  badgeText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  offlineText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
});
