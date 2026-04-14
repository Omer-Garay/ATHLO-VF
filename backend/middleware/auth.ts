import { Request, Response, NextFunction } from "express";
import { supabase } from "../db/client.js";

export interface AuthRequest extends Request {
  authUser?: {
    auth_id: string;
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    user_type: "client" | "provider" | "admin";
    client_id?: number;
    provider_id?: number;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticación requerido" });
  }

  const token = authHeader.split(" ")[1];

  // 1. Validar JWT con Supabase Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !authUser) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  // 2. Buscar en la tabla pública (con el Trigger activo, esto SIEMPRE debería existir)
  const { data: dbUser, error: dbErr } = await supabase
    .from("users")
    .select("user_id, email, first_name, last_name, user_type")
    .eq("email", authUser.email!.toLowerCase())
    .maybeSingle();

  if (dbErr) {
    console.error("DB ERROR:", dbErr.message);
    return res.status(500).json({ error: "Error interno al consultar perfil" });
  }

  if (!dbUser) {
    // Si esto sucede, el Trigger falló o hay un problema de RLS (permisos de lectura)
    console.warn(`Aviso: el usuario auth existe (${authUser.email}) pero no tiene perfil en public.users`);
    return res.status(401).json({ error: "Perfil de usuario no sincronizado. Contacte a soporte." });
  }

  // 3. Obtener IDs adicionales según el rol
  let client_id: number | undefined;
  let provider_id: number | undefined;

  if (dbUser.user_type === "client") {
    const { data: cp } = await supabase
      .from("client_profiles")
      .select("client_id")
      .eq("user_id", dbUser.user_id)
      .maybeSingle();
    client_id = cp?.client_id;
  } else if (dbUser.user_type === "provider" || dbUser.user_type === "admin") {
    const { data: pp } = await supabase
      .from("provider_profiles")
      .select("provider_id")
      .eq("user_id", dbUser.user_id)
      .maybeSingle();
    provider_id = pp?.provider_id;
  }

  // 4. Adjuntar datos al request
  req.authUser = {
    auth_id: authUser.id,
    user_id: dbUser.user_id,
    email: dbUser.email,
    first_name: dbUser.first_name,
    last_name: dbUser.last_name,
    user_type: dbUser.user_type as any, // casting para evitar errores de tipo
    client_id,
    provider_id,
  };

  next();
}

/** Guards de roles */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.authUser?.user_type !== "admin") {
    return res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
  }
  next();
}

export function requireProvider(req: AuthRequest, res: Response, next: NextFunction) {
  if (!["provider", "admin"].includes(req.authUser?.user_type ?? "")) {
    return res.status(403).json({ error: "Acceso denegado: se requiere rol de proveedor" });
  }
  next();
}
