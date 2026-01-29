import { db } from "@/lib/db";

const HEARTBEAT_THRESHOLD = 30000; // 30 seconds - consider offline if no heartbeat

interface WorkerStatus {
  extraction: "online" | "offline" | "unknown";
  execution: "online" | "offline" | "unknown";
  isOnline: boolean; // true if at least extraction worker is online
}

export function useWorkerStatus(): WorkerStatus {
  const { data, isLoading } = db.useQuery({
    workerHeartbeats: {},
  });

  if (isLoading || !data?.workerHeartbeats) {
    return {
      extraction: "unknown",
      execution: "unknown",
      isOnline: false,
    };
  }

  const now = Date.now();
  const heartbeats = data.workerHeartbeats;

  const extractionHeartbeat = heartbeats.find((h) => h.name === "extraction");
  const executionHeartbeat = heartbeats.find((h) => h.name === "execution");

  const extractionStatus = extractionHeartbeat
    ? now - extractionHeartbeat.lastSeen < HEARTBEAT_THRESHOLD
      ? "online"
      : "offline"
    : "unknown";

  const executionStatus = executionHeartbeat
    ? now - executionHeartbeat.lastSeen < HEARTBEAT_THRESHOLD
      ? "online"
      : "offline"
    : "unknown";

  return {
    extraction: extractionStatus,
    execution: executionStatus,
    isOnline: extractionStatus === "online",
  };
}
