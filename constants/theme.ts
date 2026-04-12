import { Platform } from "react-native";

// Colores extraídos del logo oficial de ATHLO
// #032F5E – Azul marino oscuro (wordmark principal)
// #01B6EF – Cyan vibrante (acento del isotipo)
// #F64801 – Naranja-rojo (acento secundario del isotipo)

export const AppTheme = {
  colors: {
    // ── MARCA PRINCIPAL ────────────────────────────────
    primary: "#032F5E",       // Azul Marino (Autoridad)
    primaryDark: "#011A35",   // Para status bars o fondos profundos
    primaryLight: "#124072",  
    
    accent: "#01B6EF",        // Cyan (Energía/Acción)
    accentDark: "#0093C2",    
    accentSoft: "#E6F8FE",    // Para fondos de etiquetas o botones secundarios
    
    highlight: "#F64801",     // Naranja (Urgencia/Deporte)
    highlightSoft: "#FFF1EB", // Fondos de notificaciones importantes

    // ── NEUTROS Y SUPERFICIES ──────────────────────────
    // Usamos "Blue Grays" para que la app no se sienta gris fría
    background: "#F4F7FA",    // Fondo de la app (más limpio)
    card: "#FFFFFF",          // Tarjetas blancas puras
    white: "#FFFFFF",
    
    text: "#0A1929",          // Casi negro pero con matiz azul (mejor legibilidad)
    textMuted: "#475569",     // Subtítulos
    textSoft: "#94A3B8",      // Placeholder o textos muy pequeños
    textOnDark: "#FFFFFF",    // Texto sobre fondos primarios
    
    border: "#E2E8F0",        // Bordes más sutiles y modernos
    inputBg: "#F8FAFC",       // Fondo de inputs más claro que el background
    
    // ── ESTADOS (Semántica) ───────────────────────────
    success: "#10B981",       // Verde esmeralda (más moderno)
    successSoft: "#ECFDF5",
    warning: "#F59E0B",       // Ámbar
    warningSoft: "#FFFBEB",
    danger: "#EF4444",        // Rojo vibrante
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
  { id: "Pádel", label: "Pádel", icon: "🏓" },
  { id: "Tenis", label: "Tenis", icon: "🎾" },
  { id: "Básquet", label: "Básquet", icon: "🏀" },
  { id: "Béisbol", label: "Béisbol", icon: "⚾" },
];
