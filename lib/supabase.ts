import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://brcxuzhqxnstxyczjont.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY3h1emhxeG5zdHh5Y3pqb250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjUyMDksImV4cCI6MjA4OTkwMTIwOX0.nSjBpuLJaYPey47WkF9husTqKz6JWXImcQ0bwRbUejE";

// En web usamos localStorage, en móvil usamos AsyncStorage
// Esto evita el error "window is not defined" durante el build de Vercel
const getStorage = () => {
  if (Platform.OS === "web") {
    // localStorage está disponible en el navegador
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    };
  }
  // En móvil usamos AsyncStorage
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  return AsyncStorage;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

