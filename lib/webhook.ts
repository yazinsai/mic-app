export interface WebhookPayload {
  text: string;
  recordingId: string;
  duration: number;
  createdAt: number;
}

export async function sendWebhook(
  webhookUrl: string,
  payload: WebhookPayload
): Promise<boolean> {
  if (!webhookUrl) {
    throw new Error("Webhook URL is not configured");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

export async function testWebhook(webhookUrl: string): Promise<boolean> {
  const testPayload: WebhookPayload = {
    text: "This is a test transcription from the Mic App.",
    recordingId: "test-recording-id",
    duration: 5.0,
    createdAt: Date.now(),
  };

  return sendWebhook(webhookUrl, testPayload);
}
