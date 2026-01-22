import { useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/db";
import { processQueue, type Recording, retryRecording, deleteRecording } from "@/lib/queue";
import { exportRecording } from "@/lib/audio";
import { useNetworkStatus } from "./useNetworkStatus";
import { useSettings } from "./useSettings";

const FAILED_STATUSES = ["upload_failed", "transcription_failed", "send_failed"];
const PENDING_STATUSES = [
  "recorded",
  "uploading",
  "uploaded",
  "transcribing",
  "transcribed",
  "sending",
];

export function useQueue() {
  const { isOnline } = useNetworkStatus();
  const { webhookUrl } = useSettings();
  const processingRef = useRef(false);

  const { data, isLoading, error } = db.useQuery({
    recordings: {
      $: { order: { createdAt: "desc" } },
      audioFile: {},
    },
  });

  const recordings = (data?.recordings ?? []) as Recording[];

  const { pendingCount, failedRecordings } = recordings.reduce(
    (acc, r) => {
      if (PENDING_STATUSES.includes(r.status)) acc.pendingCount++;
      if (FAILED_STATUSES.includes(r.status)) acc.failedRecordings.push(r);
      return acc;
    },
    { pendingCount: 0, failedRecordings: [] as Recording[] }
  );

  const failedCount = failedRecordings.length;

  const triggerProcessing = useCallback(() => {
    if (processingRef.current || !isOnline) return;

    processingRef.current = true;
    processQueue(webhookUrl, isOnline).finally(() => {
      processingRef.current = false;
    });
  }, [webhookUrl, isOnline]);

  useEffect(() => {
    if (!isOnline || (pendingCount === 0 && failedCount === 0)) return;
    triggerProcessing();
  }, [isOnline, pendingCount, failedCount, triggerProcessing]);

  const retry = useCallback(
    async (id: string) => {
      await retryRecording(id);
      triggerProcessing();
    },
    [triggerProcessing]
  );

  const remove = useCallback(async (id: string) => {
    await deleteRecording(id);
  }, []);

  const share = useCallback(async (recording: Recording) => {
    const cloudUrl = recording.audioFile?.url;
    await exportRecording(recording.localFilePath, cloudUrl);
  }, []);

  return {
    recordings,
    pendingCount,
    failedCount,
    failedRecordings,
    isLoading,
    error,
    triggerProcessing,
    retry,
    remove,
    share,
  };
}
