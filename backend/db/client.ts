/**
 * db/client.ts — Cliente Supabase con SERVICE_ROLE_KEY
 *
 * Usa la clave de servicio que bypasea RLS (solo backend).
 * Las variables ya fueron validadas en env.ts antes de que
 * este módulo se cargue.
 */
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
