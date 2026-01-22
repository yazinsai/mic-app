import { Audio } from "expo-av";
import {
  documentDirectory,
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  moveAsync,
  deleteAsync,
  downloadAsync,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export const RECORDINGS_DIR = `${documentDirectory}recordings/`;

export const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

export async function ensureRecordingsDir(): Promise<void> {
  const dirInfo = await getInfoAsync(RECORDINGS_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

export async function saveRecordingLocally(
  recording: Audio.Recording,
  recordingId: string
): Promise<{ filePath: string; duration: number }> {
  await ensureRecordingsDir();

  const uri = recording.getURI();
  if (!uri) {
    throw new Error("Recording URI not available");
  }

  const status = await recording.getStatusAsync();
  const duration = status.durationMillis ? status.durationMillis / 1000 : 0;

  const filePath = `${RECORDINGS_DIR}${recordingId}.m4a`;
  await moveAsync({ from: uri, to: filePath });

  return { filePath, duration };
}

export async function deleteLocalRecording(filePath: string): Promise<void> {
  try {
    const info = await getInfoAsync(filePath);
    if (info.exists) {
      await deleteAsync(filePath);
    }
  } catch (error) {
    console.warn("Failed to delete local recording:", error);
  }
}

export async function getLocalFileInfo(filePath: string) {
  return getInfoAsync(filePath);
}

export async function readFileAsBlob(filePath: string): Promise<Blob> {
  const fileInfo = await getInfoAsync(filePath);
  if (!fileInfo.exists) {
    throw new Error(`File not found: ${filePath}`);
  }

  const response = await fetch(fileInfo.uri);
  return response.blob();
}

export async function exportRecording(
  localFilePath: string,
  cloudUrl?: string
): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device");
  }

  const localInfo = await getInfoAsync(localFilePath);

  if (localInfo.exists) {
    await Sharing.shareAsync(localFilePath, {
      mimeType: "audio/x-m4a",
      dialogTitle: "Export Recording",
    });
    return;
  }

  if (cloudUrl) {
    const tempPath = `${cacheDirectory}temp_recording.m4a`;
    await downloadAsync(cloudUrl, tempPath);
    await Sharing.shareAsync(tempPath, {
      mimeType: "audio/x-m4a",
      dialogTitle: "Export Recording",
    });
    await deleteAsync(tempPath, { idempotent: true });
    return;
  }

  throw new Error("Audio file not found locally or in cloud");
}

export async function requestAudioPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === "granted";
}

export async function configureAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
}
