import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { ActionItem, type Action } from "./ActionItem";
import { spacing, typography, radii } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColors";

interface ActionsListProps {
  actions: Action[];
  onActionPress?: (action: Action) => void;
}

export function ActionsList({ actions, onActionPress }: ActionsListProps) {
  const colors = useColors();

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.textTertiary }]}>
          {actions.length} action{actions.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onActionPress?.(item)}
            style={({ pressed }) => [
              styles.actionPressable,
              { backgroundColor: colors.backgroundElevated },
              pressed && styles.actionPressed,
            ]}
          >
            <ActionItem action={item} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  headerText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionPressable: {
    borderRadius: radii.md,
    overflow: "hidden",
  },
  actionPressed: {
    opacity: 0.7,
  },
  separator: {
    height: spacing.sm,
  },
});
