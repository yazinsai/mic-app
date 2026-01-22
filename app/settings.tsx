import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSettings } from "@/hooks/useSettings";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { testWebhook } from "@/lib/webhook";

export default function SettingsScreen() {
  const { webhookUrl, setWebhookUrl, isLoading } = useSettings();
  const { isOnline } = useNetworkStatus();
  const [url, setUrl] = useState(webhookUrl ?? "");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const trimmedUrl = url.trim();
      await setWebhookUrl(trimmedUrl || null);
      Alert.alert("Saved", "Webhook URL has been saved.");
    } catch (error) {
      Alert.alert("Error", "Failed to save webhook URL.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a webhook URL first.");
      return;
    }

    if (!isOnline) {
      Alert.alert("Offline", "Cannot test webhook while offline.");
      return;
    }

    setIsTesting(true);
    try {
      const success = await testWebhook(url.trim());
      if (success) {
        Alert.alert("Success", "Test webhook sent successfully!");
      } else {
        Alert.alert("Failed", "Webhook did not return a 200 status.");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send test webhook."
      );
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Webhook Configuration</Text>
          <Text style={styles.sectionDescription}>
            Transcriptions will be sent to this URL as POST requests with JSON
            body containing the text.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Webhook URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/webhook"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.button, styles.testButton]}
              onPress={handleTest}
              disabled={isTesting || !isOnline}
            >
              {isTesting ? (
                <ActivityIndicator color="#3b82f6" size="small" />
              ) : (
                <Text style={[styles.buttonText, styles.testButtonText]}>
                  Test
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? "#22c55e" : "#ef4444" },
              ]}
            />
            <Text style={styles.statusText}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Webhook Payload Format</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {`{
  "text": "Transcribed text...",
  "recordingId": "abc123",
  "duration": 12.5,
  "createdAt": 1705123456789
}`}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: "#f9fafb",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionDescription: {
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: "#d1d5db",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1f2937",
    borderRadius: 8,
    padding: 14,
    color: "#f9fafb",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
  },
  testButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  testButtonText: {
    color: "#3b82f6",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: "#d1d5db",
    fontSize: 15,
  },
  codeBlock: {
    backgroundColor: "#1f2937",
    borderRadius: 8,
    padding: 16,
  },
  codeText: {
    color: "#d1d5db",
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
