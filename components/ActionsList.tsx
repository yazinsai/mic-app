import { View, Text, FlatList, StyleSheet } from "react-native";
import { ActionItem, type Action } from "./ActionItem";
import { colors, spacing, typography } from "@/constants/Colors";

interface ActionsListProps {
  actions: Action[];
}

export function ActionsList({ actions }: ActionsListProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {actions.length} action{actions.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActionItem action={item} />}
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
    color: colors.textTertiary,
    fontSize: typography.xs,
    fontWeight: typography.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  separator: {
    height: spacing.sm,
  },
});
