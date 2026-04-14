import { Platform } from "react-native";

// Colores extraídos del logo oficial de ATHLO.
export const AppTheme = {
  colors: {
    primary: "#032F5E",
    primaryDark: "#011A35",
    primaryLight: "#124072",

    accent: "#01B6EF",
    accentDark: "#0093C2",
    accentLight: "#EAF8FE",
    accentSoft: "#E6F8FE",

    highlight: "#F64801",
    highlightSoft: "#FFF1EB",

    background: "#F4F7FA",
    card: "#FFFFFF",
    white: "#FFFFFF",

    text: "#0A1929",
    textMuted: "#475569",
    textSoft: "#94A3B8",
    textOnDark: "#FFFFFF",

    border: "#E2E8F0",
    inputBg: "#F8FAFC",

    success: "#10B981",
    successSoft: "#ECFDF5",
    warning: "#F59E0B",
    warningSoft: "#FFFBEB",
    danger: "#EF4444",
    dangerSoft: "#FEF2F2",

    overlay: "rgba(3, 47, 94, 0.6)",
    starColor: "#FBBF24",
  },
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  typography: {
    title: 32,
    subtitle: 22,
    heading: 20,
    body: 16,
    small: 13,
    xs: 11,
  },
  shadow: {
    card: {
      shadowColor: "#032F5E",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    strong: {
      shadowColor: "#032F5E",
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 7,
    },
  },
};

export const SportCategories = [
  { id: "Todos", label: "Todos", icon: "🏆" },
  { id: "Fútbol", label: "Fútbol", icon: "⚽" },
  { id: "Pádel", label: "Pádel", icon: "🎾" },
  { id: "Tenis", label: "Tenis", icon: "🎾" },
  { id: "Básquet", label: "Básquet", icon: "🏀" },
  { id: "Béisbol", label: "Béisbol", icon: "⚾" },
];

export const tabBarHeight = Platform.select({
  ios: 84,
  android: 70,
  default: 72,
});
