import { db } from "./db";
import { readFileAsBlob, getFileSize, MAX_UPLOAD_SIZE } from "./audio";

export class FileTooLargeError extends Error {
  constructor(
    public fileSize: number,
    public limit: number
  ) {
    super(
      `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds upload limit (${Math.round(limit / 1024 / 1024)}MB)`
    );
    this.name = "FileTooLargeError";
  }
}

export async function uploadToStorage(
  localFilePath: string,
  recordingId: string
): Promise<string> {
  // Check file size before loading into memory
  const fileSize = await getFileSize(localFilePath);
  if (fileSize > MAX_UPLOAD_SIZE) {
    throw new FileTooLargeError(fileSize, MAX_UPLOAD_SIZE);
  }

  const blob = await readFileAsBlob(localFilePath);
  const file = new File([blob], `${recordingId}.m4a`, { type: "audio/x-m4a" });

  const storagePath = `recordings/${recordingId}.m4a`;

  const { data } = await db.storage.uploadFile(storagePath, file);

  await db.transact(db.tx.recordings[recordingId].link({ audioFile: data.id }));

  return data.id;
}

export async function getStorageUrl(fileId: string): Promise<string | null> {
  const result = await db.queryOnce({
    $files: {
      $: { where: { id: fileId } },
    },
  });

  const file = result.data.$files?.[0];
  return file?.url ?? null;
}
