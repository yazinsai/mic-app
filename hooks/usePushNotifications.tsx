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
  isEnabled: boolean;
  isLoading: boolean;
  permissionStatus: "granted" | "denied" | "undetermined";
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
}

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener>>();
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener>>();
  const hasRegistered = useRef(false);

  const clearLastActionId = useCallback(() => {
    setLastActionId(null);
  }, []);

  // Save token to InstantDB
  const saveTokenToDb = useCallback(async (token: string) => {
    const now = Date.now();
    const platform = Platform.OS;

    const { data } = await db.queryOnce({
      pushTokens: {
        $: { where: { token } },
      },
    });

    if (data.pushTokens.length > 0) {
      const existingId = data.pushTokens[0].id;
      await db.transact(
        db.tx.pushTokens[existingId].update({
          updatedAt: now,
        })
      );
      console.log("Push token updated");
    } else {
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
  }, []);

  // Delete token from InstantDB
  const deleteTokenFromDb = useCallback(async (token: string) => {
    const { data } = await db.queryOnce({
      pushTokens: {
        $: { where: { token } },
      },
    });

    if (data.pushTokens.length > 0) {
      const existingId = data.pushTokens[0].id;
      await db.transact(db.tx.pushTokens[existingId].delete());
      console.log("Push token deleted");
    }
  }, []);

  // Enable notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const token = await registerForPushNotificationsAsync();
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined");

      if (token) {
        await saveTokenToDb(token);
        setExpoPushToken(token);
        setIsEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error enabling notifications:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [saveTokenToDb]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      if (expoPushToken) {
        await deleteTokenFromDb(expoPushToken);
      }
      setExpoPushToken(null);
      setIsEnabled(false);
    } catch (error) {
      console.error("Error disabling notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [expoPushToken, deleteTokenFromDb]);

  // Check initial status and register if permitted
  useEffect(() => {
    async function initializeNotifications() {
      if (hasRegistered.current) return;
      hasRegistered.current = true;

      // Check permission status
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined");

      if (status !== "granted") {
        setIsLoading(false);
        return;
      }

      console.log("Registering for push notifications...");
      const token = await registerForPushNotificationsAsync();

      if (token) {
        console.log("Got push token:", token);
        setExpoPushToken(token);
        setIsEnabled(true);

        try {
          await saveTokenToDb(token);
        } catch (error) {
          console.error("Error saving push token:", error);
        }
      } else {
        console.log("No push token received (permission denied or not a physical device)");
      }

      setIsLoading(false);
    }

    initializeNotifications();
  }, [saveTokenToDb]);

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
        isEnabled,
        isLoading,
        permissionStatus,
        enableNotifications,
        disableNotifications,
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
