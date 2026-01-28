import { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { spacing, typography, radii } from "@/constants/Colors";
import { useThemeColors } from "@/hooks/useThemeColors";

type UpdateStatus = "checking" | "latest" | "available" | "downloading" | "ready" | "error";

export function VersionBadge() {
  const { colors, isDark } = useThemeColors();
  const [showDetails, setShowDetails] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("checking");
  const [isApplying, setIsApplying] = useState(false);

  const updateId = Updates.updateId;
  const channel = Updates.channel;
  const isEmbedded = Updates.isEmbeddedLaunch;
  const appVersion = Constants.expoConfig?.version ?? "?";

  // Check for updates on mount
  useEffect(() => {
    async function checkForUpdates() {
      // In dev mode, updates aren't available
      if (__DEV__) {
        setUpdateStatus("latest");
        return;
      }

      try {
        setUpdateStatus("checking");
        const result = await Updates.checkForUpdateAsync();
        setUpdateStatus(result.isAvailable ? "available" : "latest");
      } catch (error) {
        console.warn("Failed to check for updates:", error);
        setUpdateStatus("error");
      }
    }

    checkForUpdates();
  }, []);

  const handleApplyUpdate = async () => {
    if (updateStatus !== "available") return;

    try {
      setIsApplying(true);
      setUpdateStatus("downloading");

      await Updates.fetchUpdateAsync();
      setUpdateStatus("ready");

      // Reload the app to apply the update
      await Updates.reloadAsync();
    } catch (error) {
      console.error("Failed to apply update:", error);
      setUpdateStatus("error");
      setIsApplying(false);
    }
  };

  // Determine badge display
  const getBadgeInfo = () => {
    if (__DEV__) {
      return { label: "dev", color: colors.textMuted, dotColor: colors.warning };
    }

    switch (updateStatus) {
      case "checking":
        return { label: "...", color: colors.textMuted, dotColor: colors.textMuted };
      case "latest":
        return { label: "latest", color: colors.success, dotColor: colors.success };
      case "available":
        return { label: "update", color: colors.warning, dotColor: colors.warning };
      case "downloading":
        return { label: "updating", color: colors.primary, dotColor: colors.primary };
      case "ready":
        return { label: "ready", color: colors.success, dotColor: colors.success };
      case "error":
        return { label: "error", color: colors.error, dotColor: colors.error };
      default:
        return { label: "latest", color: colors.success, dotColor: colors.success };
    }
  };

  const badgeInfo = getBadgeInfo();

  const handleBadgePress = () => {
    // If update available, start download immediately
    if (updateStatus === "available") {
      handleApplyUpdate();
    } else {
      // Otherwise show details modal
      setShowDetails(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={handleBadgePress}
        disabled={updateStatus === "downloading" || updateStatus === "ready"}
        style={[styles.badge, { backgroundColor: colors.backgroundElevated }, !isDark && styles.badgeLightBorder]}
      >
        {updateStatus === "downloading" ? (
          <ActivityIndicator size={10} color={badgeInfo.color} />
        ) : (
          <View style={[styles.dot, { backgroundColor: badgeInfo.dotColor }]} />
        )}
        <Text style={[styles.badgeText, { color: badgeInfo.color }]}>{badgeInfo.label}</Text>
      </Pressable>

      <Modal
        visible={showDetails}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDetails(false)}
      >
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlayLight }]} onPress={() => setShowDetails(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.backgroundElevated }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>App Info</Text>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Version</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{appVersion}</Text>
            </View>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Channel</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{channel ?? "N/A"}</Text>
            </View>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Update ID</Text>
              <Text style={[styles.value, styles.mono, { color: colors.textPrimary }]}>
                {updateId ?? "None (embedded)"}
              </Text>
            </View>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Status</Text>
              <View style={styles.statusValue}>
                <View style={[styles.statusDot, { backgroundColor: badgeInfo.dotColor }]} />
                <Text style={[styles.value, { color: badgeInfo.color }]}>
                  {updateStatus === "checking" && "Checking..."}
                  {updateStatus === "latest" && "Up to date"}
                  {updateStatus === "available" && "Update available"}
                  {updateStatus === "downloading" && "Downloading..."}
                  {updateStatus === "ready" && "Ready to apply"}
                  {updateStatus === "error" && "Check failed"}
                </Text>
              </View>
            </View>

            {/* Update Button */}
            {updateStatus === "available" && (
              <Pressable
                onPress={handleApplyUpdate}
                disabled={isApplying}
                style={({ pressed }) => [
                  styles.updateButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {isApplying ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color={colors.white} />
                    <Text style={[styles.updateButtonText, { color: colors.white }]}>
                      Install Update
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {__DEV__
                ? "Running in development mode"
                : updateStatus === "available"
                ? "Tap above to download and apply the update"
                : updateStatus === "latest"
                ? "You're running the latest version"
                : isEmbedded
                ? "Running embedded bundle"
                : "Running OTA update"}
            </Text>
          </Pressable>
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
    gap: 6,
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
  badgeText: {
    fontSize: typography.xs,
    fontFamily: "SpaceMono",
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
    maxWidth: 320,
  },
  title: {
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
  },
  label: {
    fontSize: typography.sm,
  },
  value: {
    fontSize: typography.sm,
    textAlign: "right",
    flex: 1,
    marginLeft: spacing.md,
  },
  statusValue: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    marginLeft: spacing.md,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mono: {
    fontFamily: "SpaceMono",
    fontSize: typography.xs,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  updateButtonText: {
    fontSize: typography.sm,
    fontWeight: "600",
  },
  hint: {
    fontSize: typography.xs,
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
