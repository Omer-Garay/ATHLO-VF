/**
 * routes/auth.ts
 *
 * POST /auth/signup        — Crear cuenta nueva
 * GET  /auth/me            — Datos del usuario autenticado
 * POST /auth/sync          — Sincronizar usuario Auth con public.users
 *                            (para admins creados desde el dashboard de Supabase)
 * POST /auth/set-role      — Cambiar rol de usuario (solo admins)
 */
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth.js";

const router = Router();

// ─── POST /auth/signup ────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  const { email, password, name, role = "client" } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password y name son requeridos" });
  }

  const nameParts = name.trim().split(" ");
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(" ") || "-";
  const userType  = role === "admin" ? "admin" : role === "provider" ? "provider" : "client";

  try {
    // 1. Crear en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return res.status(409).json({ error: "Este correo ya está registrado" });
      }
      throw authError;
    }

    // 2. Verificar que no exista ya en public.users (doble signup)
    const { data: existing } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        message: "Cuenta ya existía en la base de datos",
        userId: existing.user_id,
      });
    }

    // 3. Insertar en public.users
    const username = email.split("@")[0] + "_" + Date.now().toString().slice(-4);
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        username,
        email,
        password_hash: "supabase_managed",
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
        is_verified: true,
        is_active: true,
      })
      .select("user_id")
      .single();

    if (userError) throw userError;

    // 4. Crear perfil según rol
    if (userType === "client") {
      await supabase.from("client_profiles").insert({ user_id: newUser.user_id });
    } else if (userType === "provider") {
      await supabase.from("provider_profiles").insert({
        user_id: newUser.user_id,
        company_name: name,
      });
    }
    // admin: no requiere perfil de provider/client

    // 5. Preferencias de notificación
    await supabase.from("notification_preferences").insert({ user_id: newUser.user_id });

    res.status(201).json({ message: "Cuenta creada exitosamente", userId: newUser.user_id });

  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err.message || "Error al crear la cuenta" });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const u = req.authUser!;
  res.json({
    user: {
      user_id:    u.user_id,
      email:      u.email,
      first_name: u.first_name,
      last_name:  u.last_name,
      full_name:  `${u.first_name} ${u.last_name}`,
      user_type:  u.user_type,
      client_id:  u.client_id,
      provider_id: u.provider_id,
    },
  });
});

// ─── POST /auth/sync ──────────────────────────────────────────────────────────
/**
 * Sincroniza el usuario autenticado con public.users.
 * Útil cuando el admin fue creado desde el dashboard de Supabase
 * y no pasó por /auth/signup.
 *
 * Opcionalmente acepta { role: "admin" | "provider" | "client" }
 * para establecer el tipo de usuario correcto al sincronizar.
 */
router.post("/sync", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

  if (error || !authUser) {
    return res.status(401).json({ error: "Token inválido" });
  }

  const { role } = req.body; // opcional: forzar un rol específico
  const meta = authUser.user_metadata ?? {};

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from("users")
    .select("user_id, user_type, email")
    .eq("email", authUser.email!)
    .maybeSingle();

  if (existing) {
    // Si existe pero queremos cambiar el rol
    if (role && role !== existing.user_type) {
      const validRoles = ["client", "provider", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Rol inválido. Use: client, provider o admin" });
      }

      await supabase
        .from("users")
        .update({ user_type: role })
        .eq("user_id", existing.user_id);

      // Crear perfil si no existe
      if (role === "provider") {
        const { data: pp } = await supabase
          .from("provider_profiles")
          .select("provider_id")
          .eq("user_id", existing.user_id)
          .maybeSingle();

        if (!pp) {
          await supabase.from("provider_profiles").insert({
            user_id: existing.user_id,
            company_name: meta.name ?? authUser.email!.split("@")[0],
          });
        }
      }

      return res.json({
        message: `Rol actualizado a '${role}' exitosamente`,
        user_id: existing.user_id,
        user_type: role,
        already_existed: true,
      });
    }

    return res.json({
      message: "Usuario ya sincronizado",
      user_id: existing.user_id,
      user_type: existing.user_type,
      already_existed: true,
    });
  }

  // No existe → crear
  const fullName = meta.name ?? meta.full_name ?? authUser.email!.split("@")[0];
  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(" ") || "-";
  const userType  = role ?? meta.role ?? "client";
  const username  = authUser.email!.split("@")[0] + "_" + Date.now().toString().slice(-4);

  const { data: newUser, error: insertErr } = await supabase
    .from("users")
    .insert({
      username,
      email: authUser.email!,
      password_hash: "supabase_managed",
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      is_verified: true,
      is_active: true,
    })
    .select("user_id")
    .single();

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message });
  }

  // Crear perfil
  if (userType === "client") {
    await supabase.from("client_profiles").insert({ user_id: newUser.user_id });
  } else if (userType === "provider") {
    await supabase.from("provider_profiles").insert({
      user_id: newUser.user_id,
      company_name: fullName,
    });
  }

  await supabase
    .from("notification_preferences")
    .insert({ user_id: newUser.user_id })
    .then(() => {});

  res.status(201).json({
    message: `Usuario sincronizado exitosamente como '${userType}'`,
    user_id: newUser.user_id,
    user_type: userType,
    already_existed: false,
  });
});

// ─── POST /auth/set-role ──────────────────────────────────────────────────────
/**
 * Cambia el rol de cualquier usuario (solo admins pueden hacerlo).
 * Body: { target_email: string, role: "client" | "provider" | "admin" }
 */
router.post("/set-role", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { target_email, role } = req.body;

  if (!target_email || !role) {
    return res.status(400).json({ error: "target_email y role son requeridos" });
  }

  const validRoles = ["client", "provider", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Rol inválido. Use: client, provider o admin" });
  }

  const { data: targetUser, error: findErr } = await supabase
    .from("users")
    .select("user_id, user_type")
    .eq("email", target_email)
    .maybeSingle();

  if (findErr || !targetUser) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  await supabase
    .from("users")
    .update({ user_type: role })
    .eq("user_id", targetUser.user_id);

  // Asegurar que exista el perfil correspondiente
  if (role === "provider") {
    const { data: pp } = await supabase
      .from("provider_profiles")
      .select("provider_id")
      .eq("user_id", targetUser.user_id)
      .maybeSingle();

    if (!pp) {
      await supabase.from("provider_profiles").insert({
        user_id: targetUser.user_id,
        company_name: target_email.split("@")[0],
      });
    }
  } else if (role === "client") {
    const { data: cp } = await supabase
      .from("client_profiles")
      .select("client_id")
      .eq("user_id", targetUser.user_id)
      .maybeSingle();

    if (!cp) {
      await supabase.from("client_profiles").insert({ user_id: targetUser.user_id });
    }
  }

  res.json({
    message: `Rol de ${target_email} actualizado a '${role}'`,
    user_id: targetUser.user_id,
    previous_role: targetUser.user_type,
    new_role: role,
  });
});

export default router;