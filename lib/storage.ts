import { db } from "./db";
import { readFileAsBlob } from "./audio";

export async function uploadToStorage(
  localFilePath: string,
  recordingId: string
): Promise<string> {
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
