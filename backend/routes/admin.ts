/**
 * routes/admin.ts — Solo providers y admins
 *
 * GET    /admin/stats
 * GET    /admin/courts
 * POST   /admin/courts
 * PUT    /admin/courts/:id
 * DELETE /admin/courts/:id            ← NUEVO
 * PATCH  /admin/courts/:id/availability
 * POST   /admin/courts/:id/image      ← MOVIDO AQUÍ (estaba solo en admin_routes.ts)
 * GET    /admin/courts/:id/schedules  ← NUEVO
 * PUT    /admin/courts/:id/schedules  ← NUEVO
 * GET    /admin/bookings
 * GET    /admin/payouts
 * GET    /admin/facilities
 * GET    /admin/sport-types
 */
import { Buffer } from "buffer";
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, requireProvider, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireProvider);

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
router.get("/stats", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;

  let totalCourts = 0, totalBookings = 0, totalRevenue = 0, avgRating = 0;

  if (isAdminOnly) {
    const [c, b, r] = await Promise.all([
      supabase.from("fields").select("field_id", { count: "exact", head: true }),
      supabase.from("bookings").select("booking_id", { count: "exact", head: true }),
      supabase.from("bookings").select("final_price").in("booking_status", ["confirmed", "completed"]),
    ]);
    totalCourts = c.count ?? 0;
    totalBookings = b.count ?? 0;
    totalRevenue = (r.data ?? []).reduce((s, x) => s + Number(x.final_price), 0);
  } else {
    const [c, b, r] = await Promise.all([
      supabase.from("facilities").select("fields(field_id)", { count: "exact", head: true }).eq("provider_id", provider_id!),
      supabase.from("bookings").select("booking_id", { count: "exact", head: true }).eq("provider_id", provider_id!),
      supabase.from("bookings").select("final_price").eq("provider_id", provider_id!).in("booking_status", ["confirmed", "completed"]),
    ]);
    totalCourts = c.count ?? 0;
    totalBookings = b.count ?? 0;
    totalRevenue = (r.data ?? []).reduce((s, x) => s + Number(x.final_price), 0);

    const { data: facilities } = await supabase.from("facilities").select("facility_id").eq("provider_id", provider_id!);
    if (facilities && facilities.length > 0) {
      const fids = facilities.map((f: any) => f.facility_id);
      const { data: fields } = await supabase.from("fields").select("rating").in("facility_id", fids);
      if (fields && fields.length > 0) {
        avgRating = fields.reduce((s, f) => s + Number(f.rating), 0) / fields.length;
      }
    }
  }

  res.json({ stats: { total_courts: totalCourts, total_bookings: totalBookings, total_revenue: totalRevenue, active_bookings: totalBookings, avg_rating: avgRating } });
});

// ─── GET /admin/courts ────────────────────────────────────────────────────────
router.get("/courts", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;
  let facilityIds: number[] = [];

  if (!isAdminOnly) {
    const { data: facilities, error: facErr } = await supabase.from("facilities").select("facility_id").eq("provider_id", provider_id!);
    if (facErr) return res.status(500).json({ error: facErr.message });
    facilityIds = (facilities ?? []).map((f: any) => f.facility_id);
    if (facilityIds.length === 0) return res.json({ courts: [] });
  }

  let query = supabase.from("fields").select(`
    field_id, field_name, price_per_hour, is_available, is_premium,
    rating, review_count, image_url, surface_type, capacity, description,
    sport_types ( sport_name ),
    facilities ( facility_id, facility_name, city, provider_id )
  `).order("field_name");

  if (!isAdminOnly) query = query.in("facility_id", facilityIds);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const courts = (data ?? []).map((c: any) => ({
    field_id: c.field_id,
    field_name: c.field_name,
    sport_name: c.sport_types?.sport_name ?? "—",
    price_per_hour: Number(c.price_per_hour),
    is_available: c.is_available,
    is_premium: c.is_premium ?? false,
    surface_type: c.surface_type ?? "",
    capacity: c.capacity ?? 0,
    description: c.description ?? "",
    facility_name: c.facilities?.facility_name ?? "—",
    city: c.facilities?.city ?? "—",
    rating: Number(c.rating ?? 0),
    review_count: c.review_count ?? 0,
    image_url: c.image_url ?? null,
  }));

  res.json({ courts });
});

// ─── GET /admin/facilities ────────────────────────────────────────────────────
router.get("/facilities", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;

  let query = supabase.from("facilities").select("facility_id, facility_name, city, address, is_active").eq("is_active", true).order("facility_name");
  if (!isAdminOnly && provider_id) query = query.eq("provider_id", provider_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ facilities: data ?? [] });
});

// ─── GET /admin/sport-types ───────────────────────────────────────────────────
router.get("/sport-types", async (_req, res) => {
  const { data, error } = await supabase.from("sport_types").select("sport_type_id, sport_name, icon_url").order("sport_name");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ sport_types: data ?? [] });
});

// ─── POST /admin/courts ───────────────────────────────────────────────────────
router.post("/courts", async (req: AuthRequest, res) => {
  const { field_name, facility_id, sport_type_id, price_per_hour, surface_type, capacity, description, is_premium, schedules } = req.body;

  if (!field_name || !facility_id || !sport_type_id || !price_per_hour) {
    return res.status(400).json({ error: "field_name, facility_id, sport_type_id y price_per_hour son requeridos" });
  }

  const { provider_id } = req.authUser!;
  if (provider_id) {
    const { data: facility } = await supabase.from("facilities").select("provider_id").eq("facility_id", facility_id).maybeSingle();
    if (!facility || facility.provider_id !== provider_id) {
      return res.status(403).json({ error: "No tienes permiso sobre esa instalación" });
    }
  }

  const { data, error } = await supabase.from("fields").insert({
    field_name, facility_id: Number(facility_id), sport_type_id: Number(sport_type_id),
    price_per_hour: Number(price_per_hour), surface_type: surface_type ?? null,
    capacity: capacity ? Number(capacity) : null, description: description ?? null,
    is_premium: is_premium ?? false, is_available: true,
  }).select("field_id").single();

  if (error) return res.status(500).json({ error: error.message });

  const fieldId = data.field_id;

  // Guardar horarios de operación
  if (schedules && Array.isArray(schedules) && schedules.length > 0) {
    const hoursToInsert = schedules.map((s: any) => ({
      field_id: fieldId,
      day_of_week: Number(s.day_of_week),
      opening_time: s.opening_time,
      closing_time: s.closing_time,
      is_closed: false,
    }));
    const { error: hoursErr } = await supabase.from("field_operating_hours").insert(hoursToInsert);
    if (hoursErr) console.error("Error guardando horarios:", hoursErr.message);
  }

  res.status(201).json({ field_id: fieldId, message: "Cancha creada exitosamente" });
});

// ─── PUT /admin/courts/:id ────────────────────────────────────────────────────
router.put("/courts/:id", async (req: AuthRequest, res) => {
  const allowed = ["field_name", "price_per_hour", "surface_type", "capacity", "description", "image_url", "is_premium", "is_available"];
  const updates: Record<string, any> = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Sin campos para actualizar" });

  const { error } = await supabase.from("fields").update({ ...updates, updated_at: new Date().toISOString() }).eq("field_id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Cancha actualizada exitosamente" });
});

// ─── DELETE /admin/courts/:id ─────────────────────────────────────────────────
router.delete("/courts/:id", async (req: AuthRequest, res) => {
  const fieldId = Number(req.params.id);
  const { provider_id } = req.authUser!;

  // Verificar que la cancha pertenece al provider (salvo admin global)
  if (provider_id) {
    const { data: field } = await supabase
      .from("fields")
      .select("facility_id, facilities(provider_id)")
      .eq("field_id", fieldId)
      .maybeSingle();

    const fac = Array.isArray((field as any)?.facilities) ? (field as any).facilities[0] : (field as any)?.facilities;
    if (!field || fac?.provider_id !== provider_id) {
      return res.status(403).json({ error: "No tienes permiso para eliminar esta cancha" });
    }
  }

  // Verificar si hay reservas activas
  const { data: activeBookings } = await supabase
    .from("bookings")
    .select("booking_id")
    .eq("field_id", fieldId)
    .in("booking_status", ["pending", "confirmed"])
    .limit(1);

  if (activeBookings && activeBookings.length > 0) {
    return res.status(409).json({ error: "No puedes eliminar una cancha con reservas activas. Cancélalas primero o desactiva la cancha." });
  }

  // Eliminar horarios de operación primero
  await supabase.from("field_operating_hours").delete().eq("field_id", fieldId);
  // Eliminar time_slots
  await supabase.from("time_slots").delete().eq("field_id", fieldId);
  // Eliminar calificaciones
  await supabase.from("field_ratings").delete().eq("field_id", fieldId);

  // Eliminar la cancha
  const { error } = await supabase.from("fields").delete().eq("field_id", fieldId);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Cancha eliminada exitosamente" });
});

// ─── PATCH /admin/courts/:id/availability ─────────────────────────────────────
router.patch("/courts/:id/availability", async (req: AuthRequest, res) => {
  const { is_available } = req.body;
  if (is_available === undefined) return res.status(400).json({ error: "is_available requerido" });

  const { error } = await supabase.from("fields").update({ is_available, updated_at: new Date().toISOString() }).eq("field_id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `Cancha ${is_available ? "activada" : "desactivada"} exitosamente` });
});

// ─── POST /admin/courts/:id/image ─────────────────────────────────────────────
// FIX: Este endpoint estaba solo en admin_routes.ts que NUNCA se importaba en server.ts
router.post("/courts/:id/image", async (req: AuthRequest, res) => {
  const fieldId = Number(req.params.id);
  const { image_base64, mime_type = "image/jpeg" } = req.body;

  if (!image_base64) return res.status(400).json({ error: "image_base64 es requerido" });

  const ext = mime_type === "image/png" ? "png" : mime_type === "image/webp" ? "webp" : "jpg";

  let buf: Buffer;
  try {
    buf = Buffer.from(image_base64, "base64");
  } catch {
    return res.status(400).json({ error: "image_base64 inválido" });
  }

  const storagePath = `courts/${fieldId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("courts")
    .upload(storagePath, buf, { contentType: mime_type, upsert: true });

  if (upErr) {
    console.error("Storage upload error:", upErr.message);
    return res.status(500).json({
      error: `Error al subir imagen: ${upErr.message}. Asegúrate de que el bucket "courts" existe y es público en Supabase Storage.`,
    });
  }

  const { data: urlData } = supabase.storage.from("courts").getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;

  const { error: updateErr } = await supabase
    .from("fields")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("field_id", fieldId);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  res.json({ image_url: imageUrl, message: "Imagen subida exitosamente" });
});

// ─── GET /admin/courts/:id/schedules ─────────────────────────────────────────
router.get("/courts/:id/schedules", async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from("field_operating_hours")
    .select("operating_hour_id, day_of_week, opening_time, closing_time, is_closed")
    .eq("field_id", req.params.id)
    .order("day_of_week");

  if (error) return res.status(500).json({ error: error.message });
  res.json({ schedules: data ?? [] });
});

// ─── PUT /admin/courts/:id/schedules ─────────────────────────────────────────
// Reemplaza todos los horarios de una cancha
router.put("/courts/:id/schedules", async (req: AuthRequest, res) => {
  const fieldId = Number(req.params.id);
  const { schedules } = req.body;

  if (!Array.isArray(schedules)) return res.status(400).json({ error: "schedules debe ser un array" });

  // Borrar horarios existentes
  await supabase.from("field_operating_hours").delete().eq("field_id", fieldId);

  if (schedules.length > 0) {
    const toInsert = schedules.map((s: any) => ({
      field_id: fieldId,
      day_of_week: Number(s.day_of_week),
      opening_time: s.opening_time,
      closing_time: s.closing_time,
      is_closed: s.is_closed ?? false,
    }));
    const { error } = await supabase.from("field_operating_hours").insert(toInsert);
    if (error) return res.status(500).json({ error: error.message });
  }

  res.json({ message: "Horarios actualizados exitosamente" });
});

// ─── GET /admin/bookings ──────────────────────────────────────────────────────
router.get("/bookings", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  const { status } = req.query;
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;

  let query = supabase.from("bookings").select(`
    booking_id, booking_date, start_time, end_time,
    final_price, booking_status, discount_applied,
    fields ( field_name ),
    client_profiles ( users ( first_name, last_name, email ) ),
    payments ( payment_status )
  `).order("booking_date", { ascending: false }).limit(100);

  if (!isAdminOnly && provider_id) query = query.eq("provider_id", provider_id);
  if (status) query = query.eq("booking_status", status as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const bookings = (data ?? []).map((b: any) => {
    const cp = Array.isArray(b.client_profiles) ? b.client_profiles[0] : b.client_profiles;
    const u = Array.isArray(cp?.users) ? cp.users[0] : cp?.users;
    return {
      booking_id: b.booking_id,
      client_name: u ? `${u.first_name} ${u.last_name}` : "Cliente",
      client_email: u?.email ?? "",
      field_name: Array.isArray(b.fields) ? b.fields[0]?.field_name : b.fields?.field_name ?? "",
      booking_date: b.booking_date,
      start_time: b.start_time,
      end_time: b.end_time,
      final_price: Number(b.final_price),
      discount_applied: Number(b.discount_applied ?? 0),
      booking_status: b.booking_status,
      payment_status: Array.isArray(b.payments) ? (b.payments[0]?.payment_status ?? "pending") : (b.payments?.payment_status ?? "pending"),
    };
  });

  res.json({ bookings });
});

// ─── GET /admin/payouts ───────────────────────────────────────────────────────
router.get("/payouts", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  if (!provider_id) return res.json({ payouts: [] });

  const { data, error } = await supabase.from("provider_payouts").select("*").eq("provider_id", provider_id).order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ payouts: data ?? [] });
});

export default router;
