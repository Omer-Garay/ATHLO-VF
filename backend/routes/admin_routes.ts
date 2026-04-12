/**
 * routes/admin.ts — Solo providers y admins
 *
 * GET   /admin/stats
 * GET   /admin/courts
 * POST  /admin/courts
 * PUT   /admin/courts/:id
 * PATCH /admin/courts/:id/availability
 * GET   /admin/bookings
 * GET   /admin/payouts
 * GET   /admin/facilities        ← NUEVO: listado de instalaciones del provider
 * GET   /admin/sport-types       ← NUEVO: tipos de deporte disponibles
 */
import { Buffer } from "buffer";
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, requireProvider, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireProvider);

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
router.get("/stats", async (req: AuthRequest, res) => {
  const { provider_id, user_id } = req.authUser!;

  // Para admins sin provider_id mostramos stats globales
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;

  let totalCourts = 0;
  let totalBookings = 0;
  let totalRevenue = 0;
  let avgRating = 0;

  if (isAdminOnly) {
    // Admin global: todas las canchas
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
      supabase.from("facilities").select("fields(field_id)", { count: "exact", head: true })
        .eq("provider_id", provider_id!),
      supabase.from("bookings").select("booking_id", { count: "exact", head: true })
        .eq("provider_id", provider_id!),
      supabase.from("bookings").select("final_price")
        .eq("provider_id", provider_id!)
        .in("booking_status", ["confirmed", "completed"]),
    ]);
    totalCourts = c.count ?? 0;
    totalBookings = b.count ?? 0;
    totalRevenue = (r.data ?? []).reduce((s, x) => s + Number(x.final_price), 0);

    // Rating promedio: obtener facilities del provider, luego fields
    const { data: facilities } = await supabase
      .from("facilities")
      .select("facility_id")
      .eq("provider_id", provider_id!);

    if (facilities && facilities.length > 0) {
      const facilityIds = facilities.map((f: any) => f.facility_id);
      const { data: fields } = await supabase
        .from("fields")
        .select("rating")
        .in("facility_id", facilityIds);
      if (fields && fields.length > 0) {
        avgRating = fields.reduce((s, f) => s + Number(f.rating), 0) / fields.length;
      }
    }
  }

  res.json({
    stats: {
      total_courts: totalCourts,
      total_bookings: totalBookings,
      total_revenue: totalRevenue,
      active_bookings: totalBookings,
      avg_rating: avgRating,
    },
  });
});

// ─── GET /admin/courts ────────────────────────────────────────────────────────
router.get("/courts", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;

  // Paso 1: obtener facility_ids del provider
  let facilityIds: number[] = [];

  if (!isAdminOnly) {
    const { data: facilities, error: facErr } = await supabase
      .from("facilities")
      .select("facility_id")
      .eq("provider_id", provider_id!);

    if (facErr) return res.status(500).json({ error: facErr.message });
    facilityIds = (facilities ?? []).map((f: any) => f.facility_id);

    if (facilityIds.length === 0) {
      return res.json({ courts: [] });
    }
  }

  // Paso 2: obtener fields con esos facility_ids
  let query = supabase
    .from("fields")
    .select(`
      field_id, field_name, price_per_hour, is_available, is_premium,
      rating, review_count, image_url, surface_type, capacity,
      sport_types ( sport_name ),
      facilities ( facility_id, facility_name, city, provider_id )
    `)
    .order("field_name");

  if (!isAdminOnly) {
    query = query.in("facility_id", facilityIds);
  }

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
    facility_name: c.facilities?.facility_name ?? "—",
    city: c.facilities?.city ?? "—",
    rating: Number(c.rating ?? 0),
    review_count: c.review_count ?? 0,
    image_url: c.image_url ?? null,
  }));

  res.json({ courts });
});

// ─── GET /admin/facilities ────────────────────────────────────────────────────
// Devuelve las instalaciones del provider para el formulario de nueva cancha
router.get("/facilities", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;

  let query = supabase
    .from("facilities")
    .select("facility_id, facility_name, city, address, is_active")
    .eq("is_active", true)
    .order("facility_name");

  if (!isAdminOnly && provider_id) {
    query = query.eq("provider_id", provider_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ facilities: data ?? [] });
});

// ─── GET /admin/sport-types ───────────────────────────────────────────────────
// Devuelve todos los tipos de deporte disponibles
router.get("/sport-types", async (_req, res) => {
  const { data, error } = await supabase
    .from("sport_types")
    .select("sport_type_id, sport_name, icon_url")
    .order("sport_name");

  if (error) return res.status(500).json({ error: error.message });
  res.json({ sport_types: data ?? [] });
});

// ─── POST /admin/courts ───────────────────────────────────────────────────────
router.post("/courts", async (req: AuthRequest, res) => {
  const {
    field_name, facility_id, sport_type_id, price_per_hour,
    surface_type, capacity, description, is_premium, schedules,
  } = req.body;

  if (!field_name || !facility_id || !sport_type_id || !price_per_hour) {
    return res.status(400).json({
      error: "field_name, facility_id, sport_type_id y price_per_hour son requeridos",
    });
  }

  // Verificar que la instalación pertenece al provider (salvo admin global)
  const { provider_id } = req.authUser!;
  if (provider_id) {
    const { data: facility } = await supabase
      .from("facilities")
      .select("provider_id")
      .eq("facility_id", facility_id)
      .maybeSingle();

    if (!facility || facility.provider_id !== provider_id) {
      return res.status(403).json({ error: "No tienes permiso sobre esa instalación" });
    }
  }

  const { data, error } = await supabase
    .from("fields")
    .insert({
      field_name,
      facility_id: Number(facility_id),
      sport_type_id: Number(sport_type_id),
      price_per_hour: Number(price_per_hour),
      surface_type: surface_type ?? null,
      capacity: capacity ? Number(capacity) : null,
      description: description ?? null,
      is_premium: is_premium ?? false,
      is_available: true,
    })
    .select("field_id")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const fieldId = data.field_id;

  // Guardar horarios de operación si se enviaron
  if (schedules && Array.isArray(schedules) && schedules.length > 0) {
    const hoursToInsert = schedules.map((s: any) => ({
      field_id:     fieldId,
      day_of_week:  Number(s.day_of_week),
      opening_time: s.opening_time,
      closing_time: s.closing_time,
      is_closed:    false,
    }));
    const { error: hoursErr } = await supabase
      .from("field_operating_hours")
      .insert(hoursToInsert);
    if (hoursErr) {
      console.error("Error guardando horarios:", hoursErr.message);
      // No es crítico — la cancha se creó igual
    }
  }

  res.status(201).json({
    field_id: fieldId,
    message: "Cancha creada exitosamente",
  });
});

// ─── PUT /admin/courts/:id ────────────────────────────────────────────────────
router.put("/courts/:id", async (req: AuthRequest, res) => {
  const allowed = [
    "field_name", "price_per_hour", "surface_type",
    "capacity", "description", "image_url", "is_premium",
  ];
  const updates: Record<string, any> = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Sin campos para actualizar" });
  }

  const { error } = await supabase
    .from("fields")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("field_id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Cancha actualizada exitosamente" });
});

// ─── PATCH /admin/courts/:id/availability ─────────────────────────────────────
router.patch("/courts/:id/availability", async (req: AuthRequest, res) => {
  const { is_available } = req.body;
  if (is_available === undefined) {
    return res.status(400).json({ error: "is_available requerido" });
  }

  const { error } = await supabase
    .from("fields")
    .update({ is_available, updated_at: new Date().toISOString() })
    .eq("field_id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `Cancha ${is_available ? "activada" : "desactivada"} exitosamente` });
});

// ─── GET /admin/bookings ──────────────────────────────────────────────────────
router.get("/bookings", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  const { status } = req.query;
  const isAdminOnly = req.authUser!.user_type === "admin" && !provider_id;

  let query = supabase
    .from("bookings")
    .select(`
      booking_id, booking_date, start_time, end_time,
      final_price, booking_status, discount_applied,
      fields ( field_name ),
      client_profiles ( users ( first_name, last_name, email ) ),
      payments ( payment_status )
    `)
    .order("booking_date", { ascending: false })
    .limit(100);

  if (!isAdminOnly && provider_id) {
    query = query.eq("provider_id", provider_id);
  }
  if (status) {
    query = query.eq("booking_status", status as string);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const bookings = (data ?? []).map((b: any) => {
    // client_profiles puede ser objeto o array según la relación
    const cp = Array.isArray(b.client_profiles)
      ? b.client_profiles[0]
      : b.client_profiles;
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
      payment_status: Array.isArray(b.payments)
        ? (b.payments[0]?.payment_status ?? "pending")
        : (b.payments?.payment_status ?? "pending"),
    };
  });

  res.json({ bookings });
});

// ─── GET /admin/payouts ───────────────────────────────────────────────────────
router.get("/payouts", async (req: AuthRequest, res) => {
  const { provider_id } = req.authUser!;
  if (!provider_id) return res.json({ payouts: [] });

  const { data, error } = await supabase
    .from("provider_payouts")
    .select("*")
    .eq("provider_id", provider_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ payouts: data ?? [] });
});


// ─── POST /admin/courts/:id/image ─────────────────────────────────────────────
router.post("/courts/:id/image", async (req: AuthRequest, res) => {
  const fieldId = Number(req.params.id);
  const { image_base64, mime_type = "image/jpeg" } = req.body;

  if (!image_base64) {
    return res.status(400).json({ error: "image_base64 es requerido" });
  }

  const ext = mime_type === "image/png" ? "png" : mime_type === "image/webp" ? "webp" : "jpg";
  const buf = Buffer.from(image_base64, "base64");
  const storagePath = `courts/${fieldId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("courts")
    .upload(storagePath, buf, { contentType: mime_type, upsert: true });

  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data: urlData } = supabase.storage.from("courts").getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;

  const { error: updateErr } = await supabase
    .from("fields")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("field_id", fieldId);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  res.json({ image_url: imageUrl, message: "Imagen subida exitosamente" });
});

export default router;