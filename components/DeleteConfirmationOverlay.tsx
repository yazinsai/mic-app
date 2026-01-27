import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { spacing, typography, radii, shadows } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColors";

interface DeleteConfirmationOverlayProps {
  visible: boolean;
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationOverlay({
  visible,
  title = "Delete Recording",
  message,
  onCancel,
  onConfirm,
}: DeleteConfirmationOverlayProps) {
  const colors = useColors();

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onConfirm();
  };

  const handleCancel = () => {
    Haptics.selectionAsync();
    onCancel();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        </Animated.View>

        <Animated.View
          entering={SlideInUp.duration(250)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.dialog, { backgroundColor: colors.backgroundElevated }]}
        >
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.errorBgAlpha }]}>
              <View style={styles.trashIcon}>
                <View style={[styles.trashLid, { backgroundColor: colors.error }]} />
                <View style={[styles.trashBody, { borderColor: colors.error }]}>
                  <View style={[styles.trashLine, { backgroundColor: colors.error }]} />
                  <View style={[styles.trashLine, { backgroundColor: colors.error }]} />
                  <View style={[styles.trashLine, { backgroundColor: colors.error }]} />
                </View>
              </View>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Are you sure you want to delete this recording? This action cannot be undone.
          </Text>

          {message && (
            <View style={[styles.previewContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.previewText, { color: colors.textTertiary }]} numberOfLines={3}>
                "{message}"
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && { backgroundColor: colors.border },
              ]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.error },
                pressed && { backgroundColor: colors.errorDark },
              ]}
              onPress={handleDelete}
            >
              <Text style={[styles.deleteButtonText, { color: colors.white }]}>Delete</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 340,
    ...shadows.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  trashIcon: {
    alignItems: "center",
  },
  trashLid: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    marginBottom: 2,
  },
  trashBody: {
    width: 16,
    height: 18,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingTop: 2,
  },
  trashLine: {
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: typography.semibold,
    textAlign: "center",
  },
  description: {
    fontSize: typography.base,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  previewContainer: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewText: {
    fontSize: typography.sm,
    fontStyle: "italic",
    lineHeight: 18,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: typography.md,
    fontWeight: typography.medium,
  },
  deleteButtonText: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
});
