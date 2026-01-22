import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WEBHOOK_URL_KEY = "@mic_app/webhook_url";

export function useSettings() {
  const [webhookUrl, setWebhookUrlState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(WEBHOOK_URL_KEY).then((value) => {
      setWebhookUrlState(value);
      setIsLoading(false);
    });
  }, []);

  const setWebhookUrl = useCallback(async (url: string | null) => {
    if (url) {
      await AsyncStorage.setItem(WEBHOOK_URL_KEY, url);
    } else {
      await AsyncStorage.removeItem(WEBHOOK_URL_KEY);
    }
    setWebhookUrlState(url);
  }, []);

  return { webhookUrl, setWebhookUrl, isLoading };
}
