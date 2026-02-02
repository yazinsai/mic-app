import { useState } from "react";
import { View, Text, Pressable, SectionList, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DeleteConfirmationOverlay } from "./DeleteConfirmationOverlay";
import { ActionsList } from "./ActionsList";
import type { Recording } from "@/lib/queue";
import type { Action } from "./ActionItem";
import { spacing, typography, radii, fontFamily } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColors";

interface RecordingsListProps {
  recordings: Recording[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (recording: Recording) => void;
  onActionPress?: (action: Action) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getTitle(recording: Recording): string {
  // Use AI-generated title if available
  if (recording.title) {
    return recording.title;
  }
  // Fall back to first few words of transcription
  if (recording.transcription) {
    const words = recording.transcription.trim().split(/\s+/).slice(0, 4).join(" ");
    return words.length > 30 ? words.slice(0, 30) + "..." : words;
  }
  // Fall back to time
  const date = new Date(recording.createdAt);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTime(recording: Recording): string {
  const date = new Date(recording.createdAt);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface StatusColors {
  primary: string;
  error: string;
  textTertiary: string;
}

function getStatusInfo(status: string, processingStatus: string | null | undefined, colors: StatusColors): { label: string; color: string } | null {
  // Fully complete: transcribed + processed (or sent for legacy)
  if (status === "transcribed" && processingStatus === "processed") return null;
  if (status === "sent" && !processingStatus) return null;
  if (status === "sent" && processingStatus === "processed") return null;

  // Show processing status if available (extraction worker is active)
  if (processingStatus === "processing") {
    return { label: "Extracting actions...", color: colors.primary };
  }
  if (processingStatus === "failed") {
    return { label: "Processing failed", color: colors.error };
  }

  // Transcribed but not yet processed by extraction worker
  if (status === "transcribed" && !processingStatus) {
    return { label: "Queued for extraction", color: colors.textTertiary };
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    recorded: { label: "Pending", color: colors.textTertiary },
    uploading: { label: "Uploading", color: colors.primary },
    upload_failed: { label: "Upload failed", color: colors.error },
    uploaded: { label: "Processing", color: colors.primary },
    transcribing: { label: "Transcribing", color: colors.primary },
    transcription_failed: { label: "Failed", color: colors.error },
    sending: { label: "Sending", color: colors.primary },
    send_failed: { label: "Send failed", color: colors.error },
  };
  return statusMap[status] ?? null;
}

function RecordingItem({
  recording,
  onRetry,
  onDeleteRequest,
  onShare,
  isExpanded,
  onToggleExpand,
  onActionPress,
}: {
  recording: Recording;
  onRetry: (id: string) => void;
  onDeleteRequest: (recording: Recording) => void;
  onShare: (recording: Recording) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onActionPress?: (action: Action) => void;
}) {
  const colors = useColors();
  const isFailed = recording.status.includes("failed");
  const statusInfo = getStatusInfo(recording.status, recording.processingStatus, colors);
  const actions = recording.actions ?? [];
  const hasActions = actions.length > 0;

  const handleLongPress = () => {
    Alert.alert(
      "Recording Options",
      recording.transcription
        ? `"${recording.transcription.slice(0, 100)}${recording.transcription.length > 100 ? "..." : ""}"`
        : undefined,
      [
        {
          text: isFailed ? "Retry" : "Reprocess",
          onPress: () => onRetry(recording.id),
        },
        { text: "Export", onPress: () => onShare(recording) },
        {
          text: "Delete",
          style: "destructive" as const,
          onPress: () => onDeleteRequest(recording),
        },
        { text: "Cancel", style: "cancel" as const },
      ],
      { cancelable: true }
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.item, { backgroundColor: colors.backgroundElevated }, pressed && styles.itemPressed]}
      onPress={hasActions ? onToggleExpand : undefined}
      onLongPress={handleLongPress}
    >
      {/* Top row: Title, Duration/Actions count */}
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleContainer}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {getTitle(recording)}
          </Text>
          <Text style={[styles.itemTime, { color: colors.textTertiary }]}>
            {getTime(recording)} · {formatDuration(recording.duration)}
          </Text>
        </View>

        {hasActions && (
          <View style={styles.actionsIndicator}>
            <Text style={[styles.actionsCount, { color: colors.textTertiary }]}>{actions.length}</Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textTertiary}
            />
          </View>
        )}
      </View>

      {/* Status */}
      {statusInfo && (
        <View style={styles.statusRow}>
          {statusInfo.label === "Uploading" && (
            <Text style={[styles.statusIcon, { color: colors.primary }]}>↑</Text>
          )}
          {statusInfo.label === "Extracting actions..." && (
            <Text style={[styles.statusIcon, { color: colors.primary }]}>⟳</Text>
          )}
          <Text style={[styles.itemStatus, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      )}

      {/* Transcript - snippet when collapsed, full when expanded */}
      {!statusInfo && recording.transcription && (
        <Text
          style={[
            isExpanded ? styles.transcriptFull : styles.transcriptSnippet,
            { color: colors.textSecondary },
          ]}
          numberOfLines={isExpanded ? undefined : 2}
        >
          {recording.transcription}
        </Text>
      )}

      {/* Actions - only show when expanded */}
      {isExpanded && hasActions && (
        <View style={styles.actionsContainer}>
          <ActionsList actions={actions} onActionPress={onActionPress} />
        </View>
      )}
    </Pressable>
  );
}

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const recordingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (recordingDate.getTime() === today.getTime()) {
    return "TODAY";
  } else if (recordingDate.getTime() === yesterday.getTime()) {
    return "YESTERDAY";
  }
  // Format as "DEC 4, 2025"
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

type Section = {
  title: string;
  data: Recording[];
};

function groupRecordingsByDate(recordings: Recording[]): Section[] {
  const grouped = new Map<string, Recording[]>();

  for (const recording of recordings) {
    const key = getDateKey(recording.createdAt);
    const existing = grouped.get(key) || [];
    grouped.set(key, [...existing, recording]);
  }

  return Array.from(grouped.entries()).map(([title, data]) => ({
    title,
    data,
  }));
}

export function RecordingsList({
  recordings,
  onRetry,
  onDelete,
  onShare,
  onActionPress,
}: RecordingsListProps) {
  const colors = useColors();
  const [recordingToDelete, setRecordingToDelete] = useState<Recording | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (recordings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No recordings yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
          Tap the record button to get started
        </Text>
      </View>
    );
  }

  const sections = groupRecordingsByDate(recordings);

  const handleConfirmDelete = () => {
    if (recordingToDelete) {
      onDelete(recordingToDelete.id);
      setRecordingToDelete(null);
    }
  };

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecordingItem
            recording={item}
            onRetry={onRetry}
            onDeleteRequest={setRecordingToDelete}
            onShare={onShare}
            isExpanded={expandedIds.has(item.id)}
            onToggleExpand={() => toggleExpand(item.id)}
            onActionPress={onActionPress}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.textTertiary }]}>{section.title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      <DeleteConfirmationOverlay
        visible={!!recordingToDelete}
        message={recordingToDelete?.transcription?.slice(0, 150)}
        onCancel={() => setRecordingToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 160,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionHeaderText: {
    fontSize: typography.xs,
    fontFamily: fontFamily.semibold,
    fontWeight: typography.semibold,
    letterSpacing: typography.tracking.wider,
    textTransform: "uppercase",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    paddingBottom: 120,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: typography.medium,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.base,
    textAlign: "center",
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  itemSeparator: {
    height: spacing.lg,
  },
  itemPressed: {
    opacity: 0.8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  itemTime: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  actionsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionsCount: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  actionsContainer: {
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statusIcon: {
    fontSize: typography.sm,
  },
  itemStatus: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  transcriptSnippet: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
    marginTop: spacing.sm,
  },
  transcriptFull: {
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.6,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
