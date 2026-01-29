import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { spacing, typography, radii } from "@/constants/Colors";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useWorkerStatus } from "@/hooks/useWorkerStatus";

export function WorkerStatusBadge() {
  const { colors, isDark } = useThemeColors();
  const status = useWorkerStatus();
  const [showDetails, setShowDetails] = useState(false);

  // Determine overall status for badge display
  const isOnline = status.isOnline;
  const dotColor = isOnline ? colors.success : colors.error;

  return (
    <>
      <Pressable
        onPress={() => setShowDetails(true)}
        style={[
          styles.badge,
          { backgroundColor: colors.backgroundElevated },
          !isDark && styles.badgeLightBorder,
        ]}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Ionicons
          name="desktop-outline"
          size={14}
          color={isOnline ? colors.textSecondary : colors.error}
        />
      </Pressable>

      <Modal
        visible={showDetails}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDetails(false)}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlayLight }]}
          onPress={() => setShowDetails(false)}
        >
          <View
            style={[styles.modal, { backgroundColor: colors.backgroundElevated }]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Worker Status
            </Text>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Extraction
              </Text>
              <View style={styles.statusValue}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        status.extraction === "online"
                          ? colors.success
                          : status.extraction === "offline"
                          ? colors.error
                          : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.value,
                    {
                      color:
                        status.extraction === "online"
                          ? colors.success
                          : status.extraction === "offline"
                          ? colors.error
                          : colors.textMuted,
                    },
                  ]}
                >
                  {status.extraction === "online"
                    ? "Online"
                    : status.extraction === "offline"
                    ? "Offline"
                    : "Unknown"}
                </Text>
              </View>
            </View>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Execution
              </Text>
              <View style={styles.statusValue}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        status.execution === "online"
                          ? colors.success
                          : status.execution === "offline"
                          ? colors.error
                          : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.value,
                    {
                      color:
                        status.execution === "online"
                          ? colors.success
                          : status.execution === "offline"
                          ? colors.error
                          : colors.textMuted,
                    },
                  ]}
                >
                  {status.execution === "online"
                    ? "Online"
                    : status.execution === "offline"
                    ? "Offline"
                    : "Unknown"}
                </Text>
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {status.isOnline
                ? "Voice listener is running and processing recordings"
                : "Voice listener is not running. Start it with ./start.sh in voice-listener/"}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    gap: 4,
  },
  badgeLightBorder: {
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modal: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 300,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: typography.sm,
  },
  value: {
    fontSize: typography.sm,
  },
  statusValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hint: {
    fontSize: typography.xs,
    marginTop: spacing.lg,
    textAlign: "center",
    lineHeight: typography.xs * 1.5,
  },
});
