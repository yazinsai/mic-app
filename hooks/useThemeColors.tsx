import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { themes, type ThemeColors } from "@/constants/Colors";

export type { ThemeColors };

interface ThemeContextValue {
  colors: ThemeColors;
  colorScheme: "light" | "dark";
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    // Default to dark if system returns null
    const colorScheme: "light" | "dark" = systemColorScheme ?? "dark";
    const isDark = colorScheme === "dark";
    const colors = isDark ? themes.dark : themes.light;

    return {
      colors,
      colorScheme,
      isDark,
    };
  }, [systemColorScheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColors(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeColors must be used within a ThemeProvider");
  }
  return context;
}

export function useColors(): ThemeColors {
  const { colors } = useThemeColors();
  return colors;
}
