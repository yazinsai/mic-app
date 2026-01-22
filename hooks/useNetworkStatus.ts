import { useEffect, useState, useCallback } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected ?? false);
  }, []);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
      setIsLoading(false);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    return unsubscribe;
  }, []);

  return { isOnline, isLoading, checkConnection };
}
