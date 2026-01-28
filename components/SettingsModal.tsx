import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, typography, radii } from "@/constants/Colors";
import { useThemeColors } from "@/hooks/useThemeColors";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onVocabularyPress: () => void;
  vocabularyCount: number;
}

export function SettingsModal({
  visible,
  onClose,
  onVocabularyPress,
  vocabularyCount,
}: SettingsModalProps) {
  const { colors, isDark } = useThemeColors();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlayLight }]}
        onPress={onClose}
      >
        <View
          style={[
            styles.modal,
            { backgroundColor: colors.backgroundElevated },
            !isDark && styles.modalLightBorder,
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Settings
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border },
              pressed && { backgroundColor: colors.backgroundPressed },
            ]}
            onPress={() => {
              onClose();
              onVocabularyPress();
            }}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Ionicons name="text" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.countBadge, { color: colors.textMuted }]}>
              {vocabularyCount} {vocabularyCount === 1 ? "term" : "terms"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 360,
  },
  modalLightBorder: {
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  title: {
    fontSize: typography.lg,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    fontSize: typography.sm,
    flex: 1,
  },
});
