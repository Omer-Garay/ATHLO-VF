import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://brcxuzhqxnstxyczjont.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY3h1emhxeG5zdHh5Y3pqb250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjUyMDksImV4cCI6MjA4OTkwMTIwOX0.nSjBpuLJaYPey47WkF9husTqKz6JWXImcQ0bwRbUejE";

/**
 * Storage seguro para Supabase Auth que funciona en 3 entornos:
 * 1. Build estático de Vercel (Node.js SSG) — sin window ni localStorage
 * 2. Navegador web — usa localStorage
 * 3. App móvil — usa AsyncStorage
 */
const createSafeStorage = () => {
  // Verificar si estamos en un entorno con localStorage disponible
  const hasLocalStorage =
    typeof globalThis !== "undefined" &&
    typeof (globalThis as any).localStorage !== "undefined";

  if (hasLocalStorage) {
    // Navegador web
    const ls = (globalThis as any).localStorage;
    return {
      getItem:    (key: string): Promise<string | null> => Promise.resolve(ls.getItem(key)),
      setItem:    (key: string, value: string): Promise<void> => Promise.resolve(ls.setItem(key, value)),
      removeItem: (key: string): Promise<void> => Promise.resolve(ls.removeItem(key)),
    };
  }

  // Build estático (Node.js SSG) o entorno sin localStorage:
  // Usamos un Map en memoria — la sesión no persiste pero el build no falla
  const memoryStore = new Map<string, string>();
  return {
    getItem:    (key: string): Promise<string | null> => Promise.resolve(memoryStore.get(key) ?? null),
    setItem:    (key: string, value: string): Promise<void> => Promise.resolve(void memoryStore.set(key, value)),
    removeItem: (key: string): Promise<void> => Promise.resolve(void memoryStore.delete(key)),
  };
};

// En React Native (móvil) AsyncStorage se carga dinámicamente para
// no romper el build estático de web
let _storage: any = null;

const getStorage = () => {
  if (_storage) return _storage;

  // Detectar si estamos en React Native (móvil)
  const isNative =
    typeof navigator !== "undefined" &&
    navigator.product === "ReactNative";

  if (isNative) {
    try {
      _storage = require("@react-native-async-storage/async-storage").default;
    } catch {
      _storage = createSafeStorage();
    }
  } else {
    _storage = createSafeStorage();
  }

  return _storage;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.1.28:3000";
