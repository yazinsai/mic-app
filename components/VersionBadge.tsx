import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { colors, spacing, typography, radii } from "@/constants/Colors";

export function VersionBadge() {
  const [showDetails, setShowDetails] = useState(false);

  const updateId = Updates.updateId;
  const channel = Updates.channel;
  const isEmbedded = Updates.isEmbeddedLaunch;
  const appVersion = Constants.expoConfig?.version ?? "?";

  // Short display: first 7 chars of update ID or "dev" if embedded
  const shortId = updateId ? updateId.slice(0, 7) : (isEmbedded ? "embedded" : "dev");

  return (
    <>
      <Pressable onPress={() => setShowDetails(true)} style={styles.badge}>
        <View style={[styles.dot, { backgroundColor: updateId ? colors.success : colors.warning }]} />
        <Text style={styles.badgeText}>{shortId}</Text>
      </Pressable>

      <Modal
        visible={showDetails}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDetails(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowDetails(false)}>
          <View style={styles.modal}>
            <Text style={styles.title}>App Info</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.value}>{appVersion}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Channel</Text>
              <Text style={styles.value}>{channel ?? "N/A"}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Update ID</Text>
              <Text style={[styles.value, styles.mono]}>{updateId ?? "None (embedded)"}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Embedded</Text>
              <Text style={styles.value}>{isEmbedded ? "Yes" : "No"}</Text>
            </View>

            <Text style={styles.hint}>
              {updateId
                ? "Running OTA update"
                : "Running embedded bundle (no OTA updates yet)"}
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
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: typography.xs,
    fontFamily: "SpaceMono",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 320,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.textTertiary,
    fontSize: typography.sm,
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    textAlign: "right",
    flex: 1,
    marginLeft: spacing.md,
  },
  mono: {
    fontFamily: "SpaceMono",
    fontSize: typography.xs,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.xs,
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
