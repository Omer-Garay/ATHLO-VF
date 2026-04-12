import { Platform } from 'react-native';
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚙️ CONFIGURACIÓN: Reemplaza con tus credenciales de Supabase
// Ve a: supabase.com → Tu proyecto → Settings → API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// URL base del backend (Supabase Edge Functions o tu servidor Node)
// Opción A - Supabase Edge Functions:
//   https://TU_PROYECTO.supabase.co/functions/v1/athlo-api
// Opción B - Servidor Node propio:
//   http://localhost:3000 (desarrollo) | https://api.athlo.hn (producción)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://IP WIFI:3000";
