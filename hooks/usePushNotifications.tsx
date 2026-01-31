import { useEffect, useRef, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { id } from "@instantdb/react-native";
import { db } from "@/lib/db";
import {
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
} from "@/lib/notifications";

// Configure notification handler (must be outside component)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationData {
  type?: "action_completed" | "action_awaiting_feedback";
  actionId?: string;
  actionTitle?: string;
}

interface PushNotificationsContextValue {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  lastActionId: string | null;
  clearLastActionId: () => void;
}

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener>>();
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener>>();
  const hasRegistered = useRef(false);

  const clearLastActionId = useCallback(() => {
    setLastActionId(null);
  }, []);

  // Register for push notifications and save token to pushTokens entity
  useEffect(() => {
    async function registerAndSaveToken() {
      // Only register once
      if (hasRegistered.current) return;
      hasRegistered.current = true;

      console.log("Registering for push notifications...");
      const token = await registerForPushNotificationsAsync();

      if (token) {
        console.log("Got push token:", token);
        setExpoPushToken(token);

        // Save token to pushTokens entity (no auth required)
        try {
          const now = Date.now();
          const platform = Platform.OS;

          // Try to find existing token first
          const { data } = await db.queryOnce({
            pushTokens: {
              $: { where: { token } },
            },
          });

          if (data.pushTokens.length > 0) {
            // Update existing token's timestamp
            const existingId = data.pushTokens[0].id;
            await db.transact(
              db.tx.pushTokens[existingId].update({
                updatedAt: now,
              })
            );
            console.log("Push token updated");
          } else {
            // Create new token record
            await db.transact(
              db.tx.pushTokens[id()].update({
                token,
                platform,
                createdAt: now,
                updatedAt: now,
              })
            );
            console.log("Push token saved");
          }
        } catch (error) {
          console.error("Error saving push token:", error);
        }
      } else {
        console.log("No push token received (permission denied or not a physical device)");
      }
    }

    registerAndSaveToken();
  }, []);

  // Check if app was opened from a notification
  useEffect(() => {
    async function checkInitialNotification() {
      const response = await getLastNotificationResponse();
      if (response) {
        const data = response.notification.request.content.data as NotificationData;
        if (data?.actionId) {
          console.log("App opened from notification, actionId:", data.actionId);
          setLastActionId(data.actionId);
        }
      }
    }

    checkInitialNotification();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is in foreground
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification.request.content.title);
      setNotification(notification);
    });

    // Listener for when user taps on a notification
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      console.log("Notification tapped, data:", data);

      if (data?.actionId) {
        setLastActionId(data.actionId);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <PushNotificationsContext.Provider
      value={{
        expoPushToken,
        notification,
        lastActionId,
        clearLastActionId,
      }}
    >
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications(): PushNotificationsContextValue {
  const context = useContext(PushNotificationsContext);
  if (!context) {
    throw new Error("usePushNotifications must be used within a PushNotificationsProvider");
  }
  return context;
}
