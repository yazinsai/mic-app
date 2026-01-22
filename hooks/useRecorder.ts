import { useState, useCallback, useRef, useEffect } from "react";
import { Audio } from "expo-av";
import { id } from "@instantdb/react-native";
import { db } from "@/lib/db";
import {
  RECORDING_OPTIONS,
  saveRecordingLocally,
  requestAudioPermissions,
  configureAudioMode,
} from "@/lib/audio";

export type RecorderState = "idle" | "recording" | "saving";

export function useRecorder(onRecordingComplete?: () => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    requestAudioPermissions().then(setHasPermission);
  }, []);

  const startRecording = useCallback(async () => {
    if (state !== "idle" || hasPermission === false) {
      return;
    }

    try {
      await configureAudioMode();

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      setState("recording");
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setState("idle");
    }
  }, [state, hasPermission]);

  const stopRecording = useCallback(async () => {
    if (state !== "recording" || !recordingRef.current) {
      return;
    }

    setState("saving");

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const recordingId = id();
      const { filePath, duration: actualDuration } = await saveRecordingLocally(
        recordingRef.current,
        recordingId
      );

      await db.transact(
        db.tx.recordings[recordingId].update({
          localFilePath: filePath,
          duration: actualDuration,
          createdAt: Date.now(),
          status: "recorded",
          retryCount: 0,
        })
      );

      recordingRef.current = null;
      setDuration(0);
      setState("idle");

      onRecordingComplete?.();
    } catch (error) {
      console.error("Failed to save recording:", error);
      recordingRef.current = null;
      setDuration(0);
      setState("idle");
    }
  }, [state, onRecordingComplete]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) {
      return;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch {
      // Ignore errors when canceling
    }

    recordingRef.current = null;
    setDuration(0);
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  return {
    state,
    duration,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === "recording",
    isSaving: state === "saving",
  };
}
