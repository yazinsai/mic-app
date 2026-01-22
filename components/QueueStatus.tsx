import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

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
  const { isOnline } = useNetworkStatus();

  if (pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}

      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {pendingCount} processing
          </Text>
        </View>
      )}

      {failedCount > 0 && (
        <View style={[styles.badge, styles.failedBadge]}>
          <Text style={styles.badgeText}>
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
    gap: 8,
    padding: 8,
  },
  badge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  failedBadge: {
    backgroundColor: "#ef4444",
  },
  offlineBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  offlineText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
