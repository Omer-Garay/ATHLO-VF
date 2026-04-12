/**
 * routes/profile.ts
 *
 * GET  /profile          — Obtener perfil completo del usuario autenticado
 * PUT  /profile          — Actualizar datos del perfil (nombre, teléfono, etc.)
 * POST   /profile/avatar   — Subir imagen de perfil en base64
 * DELETE /profile/avatar   — Eliminar foto de perfil
 */
import { Buffer } from "buffer";
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// ─── GET /profile ─────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { user_id } = req.authUser!;

  const { data, error } = await supabase
    .from("users")
    .select("user_id, username, email, first_name, last_name, phone_number, profile_image_url, user_type, created_at")
    .eq("user_id", user_id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  res.json({ user: data });
});

// ─── PUT /profile ─────────────────────────────────────────────────────────────
router.put("/", async (req: AuthRequest, res) => {
  const { user_id } = req.authUser!;
  const { first_name, last_name, phone_number, username } = req.body;

  const updates: Record<string, any> = {};

  if (first_name !== undefined) {
    if (!first_name.trim()) return res.status(400).json({ error: "El nombre no puede estar vacío" });
    updates.first_name = first_name.trim();
  }
  if (last_name !== undefined) {
    if (!last_name.trim()) return res.status(400).json({ error: "El apellido no puede estar vacío" });
    updates.last_name = last_name.trim();
  }
  if (phone_number !== undefined) {
    updates.phone_number = phone_number.trim() || null;
  }
  if (username !== undefined) {
    if (!username.trim()) return res.status(400).json({ error: "El nombre de usuario no puede estar vacío" });
    // Verificar que el username no esté tomado por otro usuario
    const { data: existing } = await supabase
      .from("users")
      .select("user_id")
      .eq("username", username.trim())
      .neq("user_id", user_id)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: "Ese nombre de usuario ya está en uso" });
    updates.username = username.trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No hay campos para actualizar" });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("user_id", user_id)
    .select("user_id, username, email, first_name, last_name, phone_number, profile_image_url, user_type")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Sincronizar nombre en Supabase Auth user_metadata
  const newName = `${data.first_name} ${data.last_name}`.trim();
  await supabase.auth.admin.updateUserById(req.authUser!.auth_id, {
    user_metadata: { name: newName },
  });

  res.json({ message: "Perfil actualizado exitosamente", user: data });
});

// ─── POST /profile/avatar ─────────────────────────────────────────────────────
router.post("/avatar", async (req: AuthRequest, res) => {
  const { user_id, auth_id } = req.authUser!;
  const { image_base64, mime_type = "image/jpeg" } = req.body;

  if (!image_base64) {
    return res.status(400).json({ error: "image_base64 es requerido" });
  }

  const ext = mime_type === "image/png" ? "png" : mime_type === "image/webp" ? "webp" : "jpg";
  const buf = Buffer.from(image_base64, "base64");
  const storagePath = `avatars/${user_id}/avatar.${ext}`;

  // Subir al bucket "avatars" de Supabase Storage
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(storagePath, buf, { contentType: mime_type, upsert: true });

  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(storagePath);
  // Agregar cache-busting para forzar recarga de imagen
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Guardar URL en public.users
  const { error: updateErr } = await supabase
    .from("users")
    .update({ profile_image_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Sincronizar en Supabase Auth metadata
  await supabase.auth.admin.updateUserById(auth_id, {
    user_metadata: { avatar_url: avatarUrl },
  });

  res.json({ avatar_url: avatarUrl, message: "Foto de perfil actualizada exitosamente" });
});


// ─── DELETE /profile/avatar ───────────────────────────────────────────────────
router.delete("/avatar", async (req: AuthRequest, res) => {
  const { user_id, auth_id } = req.authUser!;

  // Borrar archivo del storage
  const storagePath = `avatars/${user_id}`;
  // Listar archivos del usuario para borrar cualquier extensión
  const { data: files } = await supabase.storage.from("avatars").list(storagePath);
  if (files && files.length > 0) {
    const paths = files.map((f: any) => `${storagePath}/${f.name}`);
    await supabase.storage.from("avatars").remove(paths);
  }

  // Limpiar URL en public.users
  const { error } = await supabase
    .from("users")
    .update({ profile_image_url: null, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);

  if (error) return res.status(500).json({ error: error.message });

  // Limpiar en Supabase Auth metadata
  await supabase.auth.admin.updateUserById(auth_id, {
    user_metadata: { avatar_url: null },
  });

  res.json({ message: "Foto de perfil eliminada exitosamente" });
});

export default router;
