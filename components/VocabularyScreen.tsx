import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { spacing, typography, radii } from "@/constants/Colors";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useVocabulary, type VocabularyTerm } from "@/hooks/useVocabulary";

interface VocabularyScreenProps {
  visible: boolean;
  onClose: () => void;
}

function TermItem({
  term,
  onDelete,
}: {
  term: VocabularyTerm;
  onDelete: () => void;
}) {
  const { colors } = useThemeColors();

  const renderRightActions = () => (
    <Pressable
      style={[styles.deleteAction, { backgroundColor: colors.error }]}
      onPress={onDelete}
    >
      <Ionicons name="trash-outline" size={20} color={colors.white} />
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View
        style={[
          styles.termItem,
          { backgroundColor: colors.backgroundElevated, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.termText, { color: colors.textPrimary }]}>
          {term.term}
        </Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {new Date(term.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Swipeable>
  );
}

export function VocabularyScreen({ visible, onClose }: VocabularyScreenProps) {
  const { colors } = useThemeColors();
  const { terms, addTerm, removeTerm, isLoading } = useVocabulary();
  const [newTerm, setNewTerm] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  const handleAddTerm = async () => {
    if (!newTerm.trim()) return;

    await addTerm(newTerm);
    setNewTerm("");
    setShowAddInput(false);
  };

  const handleDelete = (term: VocabularyTerm) => {
    Alert.alert("Delete Term", `Remove "${term.term}" from vocabulary?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeTerm(term.id),
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.flex1} edges={["top"]}>
          <KeyboardAvoidingView
            style={styles.flex1}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Pressable onPress={onClose} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Vocabulary
              </Text>
              <Pressable
                onPress={() => setShowAddInput(true)}
                style={[styles.addButton, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={20} color={colors.white} />
              </Pressable>
            </View>

            {/* Description */}
            <View style={[styles.descriptionBox, { backgroundColor: colors.backgroundElevated }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                Add terms that are frequently misheard during transcription (e.g., company
                names, technical jargon, proper nouns).
              </Text>
            </View>

            {/* Add Input */}
            {showAddInput && (
              <View
                style={[
                  styles.addInputContainer,
                  { backgroundColor: colors.backgroundElevated, borderBottomColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
                  placeholder="Enter a term..."
                  placeholderTextColor={colors.textMuted}
                  value={newTerm}
                  onChangeText={setNewTerm}
                  autoFocus
                  onSubmitEditing={handleAddTerm}
                  returnKeyType="done"
                />
                <View style={styles.inputButtons}>
                  <Pressable
                    onPress={() => {
                      setNewTerm("");
                      setShowAddInput(false);
                    }}
                    style={[styles.cancelButton, { backgroundColor: colors.backgroundPressed }]}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddTerm}
                    disabled={!newTerm.trim()}
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor: newTerm.trim()
                          ? colors.primary
                          : colors.backgroundPressed,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.saveButtonText,
                        { color: newTerm.trim() ? colors.white : colors.textMuted },
                      ]}
                    >
                      Add
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Terms List */}
            {terms.length === 0 && !isLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="text-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  No vocabulary terms yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Tap the + button to add terms that should be spelled correctly in
                  transcriptions.
                </Text>
              </View>
            ) : (
              <FlatList
                data={terms}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TermItem term={item} onDelete={() => handleDelete(item)} />
                )}
                contentContainerStyle={styles.listContent}
              />
            )}

            {/* Swipe Hint */}
            {terms.length > 0 && (
              <View style={[styles.hintContainer, { borderTopColor: colors.border }]}>
                <Ionicons name="hand-left-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                  Swipe left to delete
                </Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: "600",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  descriptionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  descriptionText: {
    flex: 1,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
  },
  addInputContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    fontSize: typography.base,
  },
  inputButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: "flex-end",
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  cancelButtonText: {
    fontSize: typography.sm,
    fontWeight: "500",
  },
  saveButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  saveButtonText: {
    fontSize: typography.sm,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  termItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  termText: {
    fontSize: typography.base,
    fontWeight: "500",
  },
  dateText: {
    fontSize: typography.xs,
  },
  deleteAction: {
    width: 70,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: "600",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sm,
    textAlign: "center",
    lineHeight: typography.sm * 1.5,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  hintText: {
    fontSize: typography.xs,
  },
});
