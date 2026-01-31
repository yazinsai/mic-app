/**
 * Push notification sender for the voice-listener workers.
 * Sends notifications via Expo's push notification service when action status changes.
 */

import { db } from "./db";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification via Expo's push notification service.
 */
async function sendExpoPushNotification(message: ExpoPushMessage): Promise<ExpoPushTicket> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    // The API returns { data: [...tickets] }
    const ticket = result.data?.[0] ?? result;

    if (ticket.status === "error") {
      console.error("Push notification error:", ticket.message, ticket.details);
    }

    return ticket;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all registered push tokens from the pushTokens entity.
 */
async function getPushTokens(): Promise<string[]> {
  try {
    const result = await db.query({
      pushTokens: {},
    });

    const pushTokenRecords = result.pushTokens ?? [];
    const tokens: string[] = [];

    for (const record of pushTokenRecords) {
      if (record.token && typeof record.token === "string") {
        tokens.push(record.token);
      }
    }

    console.log(`Found ${tokens.length} push token(s)`);
    return tokens;
  } catch (error) {
    console.error("Failed to get push tokens:", error);
    return [];
  }
}

/**
 * Send a notification when an action is completed.
 */
export async function notifyActionCompleted(
  actionId: string,
  actionTitle: string,
  actionType: string
): Promise<void> {
  const tokens = await getPushTokens();

  if (tokens.length === 0) {
    console.log("No push tokens registered, skipping notification");
    return;
  }

  const emoji = getActionEmoji(actionType);
  const title = `${emoji} Action Completed`;
  const body = actionTitle;

  for (const token of tokens) {
    await sendExpoPushNotification({
      to: token,
      title,
      body,
      sound: "default",
      data: {
        type: "action_completed",
        actionId,
        actionTitle,
      },
    });
  }

  console.log(`Sent completion notification for action: ${actionTitle}`);
}

/**
 * Send a notification when an action needs user feedback/review.
 */
export async function notifyActionAwaitingFeedback(
  actionId: string,
  actionTitle: string,
  actionType: string
): Promise<void> {
  const tokens = await getPushTokens();

  if (tokens.length === 0) {
    console.log("No push tokens registered, skipping notification");
    return;
  }

  const emoji = getActionEmoji(actionType);
  const title = `${emoji} Ready for Review`;
  const body = `${actionTitle} - tap to review and provide feedback`;

  for (const token of tokens) {
    await sendExpoPushNotification({
      to: token,
      title,
      body,
      sound: "default",
      data: {
        type: "action_awaiting_feedback",
        actionId,
        actionTitle,
      },
    });
  }

  console.log(`Sent feedback notification for action: ${actionTitle}`);
}

/**
 * Send a notification when an action fails.
 */
export async function notifyActionFailed(
  actionId: string,
  actionTitle: string,
  errorMessage?: string
): Promise<void> {
  const tokens = await getPushTokens();

  if (tokens.length === 0) {
    console.log("No push tokens registered, skipping notification");
    return;
  }

  const title = "Action Failed";
  const body = errorMessage
    ? `${actionTitle}: ${errorMessage.slice(0, 100)}`
    : `${actionTitle} failed to complete`;

  for (const token of tokens) {
    await sendExpoPushNotification({
      to: token,
      title,
      body,
      sound: "default",
      data: {
        type: "action_failed",
        actionId,
        actionTitle,
      },
    });
  }

  console.log(`Sent failure notification for action: ${actionTitle}`);
}

/**
 * Get an emoji for the action type.
 */
function getActionEmoji(actionType: string): string {
  switch (actionType) {
    case "CodeChange":
      return "🔧";
    case "Project":
      return "🚀";
    case "Research":
      return "🔍";
    case "Write":
      return "✍️";
    case "UserTask":
      return "📋";
    default:
      return "✅";
  }
}
