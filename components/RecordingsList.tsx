import { View, Text, Pressable, FlatList, StyleSheet, Alert } from "react-native";
import type { Recording } from "@/lib/queue";

interface RecordingsListProps {
  recordings: Recording[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (recording: Recording) => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    recorded: "Pending upload",
    uploading: "Uploading...",
    upload_failed: "Upload failed",
    uploaded: "Pending transcription",
    transcribing: "Transcribing...",
    transcription_failed: "Transcription failed",
    transcribed: "Pending delivery",
    sending: "Sending...",
    send_failed: "Delivery failed",
    sent: "Completed",
  };
  return labels[status] ?? status;
}

function getStatusColor(status: string): string {
  if (status.includes("failed")) return "#ef4444";
  if (status === "sent") return "#22c55e";
  if (status.includes("ing")) return "#3b82f6";
  return "#9ca3af";
}

function RecordingItem({
  recording,
  onRetry,
  onDelete,
  onShare,
}: {
  recording: Recording;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (recording: Recording) => void;
}) {
  const isFailed = recording.status.includes("failed");

  const handleDelete = () => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(recording.id),
        },
      ]
    );
  };

  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(recording.createdAt)}</Text>
        <Text style={styles.itemDuration}>
          {formatDuration(recording.duration)}
        </Text>
      </View>

      <View style={styles.itemStatus}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(recording.status) },
          ]}
        />
        <Text style={styles.statusText}>{getStatusLabel(recording.status)}</Text>
      </View>

      {recording.errorMessage && (
        <Text style={styles.errorText} numberOfLines={2}>
          {recording.errorMessage}
        </Text>
      )}

      {recording.transcription && (
        <Text style={styles.transcriptionText} numberOfLines={2}>
          {recording.transcription}
        </Text>
      )}

      <View style={styles.actions}>
        {isFailed && (
          <Pressable
            style={styles.actionButton}
            onPress={() => onRetry(recording.id)}
          >
            <Text style={styles.actionButtonText}>Retry</Text>
          </Pressable>
        )}

        <Pressable style={styles.actionButton} onPress={() => onShare(recording)}>
          <Text style={styles.actionButtonText}>Export</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function RecordingsList({
  recordings,
  onRetry,
  onDelete,
  onShare,
}: RecordingsListProps) {
  if (recordings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No recordings yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={recordings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RecordingItem
          recording={item}
          onRetry={onRetry}
          onDelete={onDelete}
          onShare={onShare}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
  },
  item: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemDate: {
    color: "#f9fafb",
    fontSize: 15,
    fontWeight: "600",
  },
  itemDuration: {
    color: "#9ca3af",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  itemStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
    marginTop: 8,
  },
  transcriptionText: {
    color: "#d1d5db",
    fontSize: 13,
    marginTop: 8,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: "#f9fafb",
    fontSize: 13,
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  deleteButtonText: {
    color: "#ef4444",
  },
});
