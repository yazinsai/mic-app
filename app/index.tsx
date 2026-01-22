import { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Text,
  Modal,
} from "react-native";
import { Link } from "expo-router";
import { RecordButton } from "@/components/RecordButton";
import { QueueStatus } from "@/components/QueueStatus";
import { RecordingsList } from "@/components/RecordingsList";
import { useQueue } from "@/hooks/useQueue";

export default function HomeScreen() {
  const [showRecordings, setShowRecordings] = useState(false);
  const {
    recordings,
    pendingCount,
    failedCount,
    triggerProcessing,
    retry,
    remove,
    share,
  } = useQueue();

  const handleRecordingComplete = () => {
    triggerProcessing();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Link href="/settings" asChild>
          <Pressable style={styles.settingsButton}>
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.content}>
        <RecordButton onRecordingComplete={handleRecordingComplete} />
      </View>

      <View style={styles.footer}>
        <QueueStatus
          pendingCount={pendingCount}
          failedCount={failedCount}
          onPress={() => setShowRecordings(true)}
        />

        {recordings.length > 0 && (
          <Pressable
            style={styles.viewAllButton}
            onPress={() => setShowRecordings(true)}
          >
            <Text style={styles.viewAllText}>
              View all ({recordings.length})
            </Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={showRecordings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecordings(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recordings</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowRecordings(false)}
            >
              <Text style={styles.closeText}>Done</Text>
            </Pressable>
          </View>

          <RecordingsList
            recordings={recordings}
            onRetry={retry}
            onDelete={remove}
            onShare={share}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
  },
  settingsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingsText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 32,
    gap: 12,
  },
  viewAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  viewAllText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#111827",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  modalTitle: {
    color: "#f9fafb",
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "500",
  },
});
