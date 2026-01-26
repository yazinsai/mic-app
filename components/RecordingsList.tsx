import { useState } from "react";
import { View, Text, Pressable, SectionList, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DeleteConfirmationOverlay } from "./DeleteConfirmationOverlay";
import { ActionsList } from "./ActionsList";
import type { Recording } from "@/lib/queue";
import { colors, spacing, typography, radii } from "@/constants/Colors";

interface RecordingsListProps {
  recordings: Recording[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (recording: Recording) => void;
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

function getStatusInfo(status: string, processingStatus?: string | null): { label: string; color: string } | null {
  if (status === "sent" && !processingStatus) return null;
  if (status === "sent" && processingStatus === "processed") return null;

  // Show processing status if available
  if (processingStatus === "processing") {
    return { label: "Extracting actions...", color: colors.primary };
  }
  if (processingStatus === "failed") {
    return { label: "Processing failed", color: colors.error };
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    recorded: { label: "Pending", color: colors.textTertiary },
    uploading: { label: "Uploading", color: colors.primary },
    upload_failed: { label: "Upload failed", color: colors.error },
    uploaded: { label: "Processing", color: colors.primary },
    transcribing: { label: "Transcribing", color: colors.primary },
    transcription_failed: { label: "Failed", color: colors.error },
    transcribed: { label: "Sending", color: colors.primary },
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
}: {
  recording: Recording;
  onRetry: (id: string) => void;
  onDeleteRequest: (recording: Recording) => void;
  onShare: (recording: Recording) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const isFailed = recording.status.includes("failed");
  const statusInfo = getStatusInfo(recording.status, recording.processingStatus);
  const isRetryable = recording.status !== "sent";
  const actions = recording.actions ?? [];
  const hasActions = actions.length > 0;

  const handleLongPress = () => {
    Alert.alert(
      "Recording Options",
      recording.transcription
        ? `"${recording.transcription.slice(0, 100)}${recording.transcription.length > 100 ? "..." : ""}"`
        : undefined,
      [
        ...(isRetryable
          ? [
              {
                text: isFailed ? "Retry" : "Reprocess",
                onPress: () => onRetry(recording.id),
              },
            ]
          : []),
        { text: "Export", onPress: () => onShare(recording) },
        {
          text: "Delete",
          style: "destructive" as const,
          onPress: () => onDeleteRequest(recording),
        },
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={hasActions ? onToggleExpand : undefined}
      onLongPress={handleLongPress}
    >
      {/* Top row: Title, Duration/Actions count */}
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {getTitle(recording)}
          </Text>
          <Text style={styles.itemTime}>
            {getTime(recording)} · {formatDuration(recording.duration)}
          </Text>
        </View>

        {hasActions && (
          <View style={styles.actionsIndicator}>
            <Text style={styles.actionsCount}>{actions.length}</Text>
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
            <Text style={styles.statusIcon}>↑</Text>
          )}
          {statusInfo.label === "Extracting actions..." && (
            <Text style={styles.statusIcon}>⟳</Text>
          )}
          <Text style={[styles.itemStatus, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      )}

      {/* Transcript snippet - only show when collapsed or no actions */}
      {!isExpanded && !statusInfo && recording.transcription && (
        <Text style={styles.transcriptSnippet} numberOfLines={2}>
          {recording.transcription}
        </Text>
      )}

      {/* Actions - only show when expanded */}
      {isExpanded && hasActions && (
        <View style={styles.actionsContainer}>
          <ActionsList actions={actions} />
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
}: RecordingsListProps) {
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
        <Text style={styles.emptyTitle}>No recordings yet</Text>
        <Text style={styles.emptySubtitle}>
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
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
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
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionHeaderText: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 0.5,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    paddingBottom: 120,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: typography.medium,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textTertiary,
    fontSize: typography.base,
    textAlign: "center",
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundElevated,
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
    color: colors.textPrimary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  itemTime: {
    color: colors.textTertiary,
    fontSize: typography.xs,
    marginTop: 2,
  },
  actionsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionsCount: {
    color: colors.textTertiary,
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
    color: colors.primary,
    fontSize: typography.sm,
  },
  itemStatus: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  transcriptSnippet: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: typography.sm * 1.5,
    marginTop: spacing.sm,
  },
});
