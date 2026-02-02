import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type TabMode = "review" | "active" | "done";

interface ActionsScreenState {
  tabMode: TabMode;
  scrollPosition: number;
}

const STORAGE_KEY = "@actions_screen_state";
const DEFAULT_STATE: ActionsScreenState = {
  tabMode: "review",
  scrollPosition: 0,
};

// Debounce helper for scroll position persistence
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useActionsScreenState() {
  const [tabMode, setTabModeInternal] = useState<TabMode>(DEFAULT_STATE.tabMode);
  const [scrollPosition, setScrollPositionInternal] = useState<number>(DEFAULT_STATE.scrollPosition);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: ActionsScreenState = JSON.parse(stored);
          setTabModeInternal(parsed.tabMode ?? DEFAULT_STATE.tabMode);
          setScrollPositionInternal(parsed.scrollPosition ?? DEFAULT_STATE.scrollPosition);
        }
      } catch (error) {
        console.warn("Failed to load actions screen state:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // Persist state when tab changes
  const setTabMode = useCallback(async (mode: TabMode) => {
    setTabModeInternal(mode);
    // Reset scroll position when changing tabs
    setScrollPositionInternal(0);
    try {
      const state: ActionsScreenState = { tabMode: mode, scrollPosition: 0 };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist tab mode:", error);
    }
  }, []);

  // Debounced scroll position persistence
  const persistScrollPosition = useRef(
    debounce(async (position: number, currentTab: TabMode) => {
      try {
        const state: ActionsScreenState = { tabMode: currentTab, scrollPosition: position };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn("Failed to persist scroll position:", error);
      }
    }, 500)
  ).current;

  const setScrollPosition = useCallback((position: number) => {
    setScrollPositionInternal(position);
    persistScrollPosition(position, tabMode);
  }, [tabMode, persistScrollPosition]);

  return {
    tabMode,
    setTabMode,
    scrollPosition,
    setScrollPosition,
    isLoaded,
  };
}
