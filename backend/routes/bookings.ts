/**
 * routes/bookings.ts
 * GET  /bookings            — Reservas del usuario autenticado
 * GET  /bookings/:id        — Detalle de una reserva
 * POST /bookings            — Crear reserva (valida disponibilidad)
 * POST /bookings/:id/cancel — Cancelar reserva
 * POST /bookings/:id/rate   — Calificar una reserva completada
 */
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// ─── GET /bookings ────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { client_id } = req.authUser!;
  if (!client_id) return res.json({ bookings: [] });

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      booking_id, field_id, booking_date, start_time, end_time, duration_hours,
      total_price, final_price, discount_applied,
      booking_status, cancellation_reason, qr_code_token,
      number_of_players, notes, created_at,
      fields (
        field_id, field_name,
        sport_types (sport_name),
        facilities (facility_name, city)
      ),
      payments (payment_status, payment_method_id,
        payment_methods (payment_type, card_last_four)
      )
    `)
    .eq("client_id", client_id)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const bookings = (data ?? []).map((b: any) => ({
    booking_id: b.booking_id,
    field_name: b.fields?.field_name,
    field_id: b.field_id,
    facility_name: b.fields?.facilities?.facility_name,
    city: b.fields?.facilities?.city,
    sport_name: b.fields?.sport_types?.sport_name,
    booking_date: b.booking_date,
    start_time: b.start_time,
    end_time: b.end_time,
    duration_hours: Number(b.duration_hours),
    total_price: Number(b.total_price),
    final_price: Number(b.final_price),
    discount_applied: Number(b.discount_applied ?? 0),
    booking_status: b.booking_status,
    cancellation_reason: b.cancellation_reason,
    qr_code_token: b.qr_code_token,
    number_of_players: b.number_of_players,
    notes: b.notes,
    payment_status: b.payments?.[0]?.payment_status ?? "pending",
    payment_method: b.payments?.[0]?.payment_methods?.payment_type ?? null,
    created_at: b.created_at,
  }));

  res.json({ bookings });
});

// ─── GET /bookings/:id ────────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const { client_id } = req.authUser!;
  const { data, error } = await supabase
    .from("bookings")
    .select("*, fields(field_name, facilities(facility_name, city), sport_types(sport_name))")
    .eq("booking_id", req.params.id)
    .eq("client_id", client_id!)
    .single();

  if (error || !data) return res.status(404).json({ error: "Reserva no encontrada" });
  res.json({ booking: data });
});

// ─── POST /bookings ───────────────────────────────────────────────────────────
router.post("/", async (req: AuthRequest, res) => {
  const { field_id, booking_date, start_time, end_time, number_of_players, payment_method_id, promo_code, notes } = req.body;
  let { client_id, user_id } = req.authUser!;
  if ((req as any)._resolved_client_id) client_id = (req as any)._resolved_client_id;

  if (!field_id || !booking_date || !start_time || !end_time) {
    return res.status(400).json({ error: "field_id, booking_date, start_time y end_time son requeridos" });
  }
  if (!client_id) {
    // El usuario admin/provider no tiene client_id. 
    // Intentar crear perfil de cliente automáticamente para permitir reservas de prueba.
    const { supabase } = await import("../db/client.js");
    const { data: newCp, error: cpErr } = await supabase
      .from("client_profiles")
      .insert({ user_id: req.authUser!.user_id })
      .select("client_id")
      .single();
    if (cpErr || !newCp) {
      return res.status(403).json({
        error: "Esta cuenta no tiene perfil de cliente. Las reservas requieren un perfil de cliente.",
      });
    }
    req.authUser!.client_id = newCp.client_id;
    // Re-asignar para el resto del handler
    (req as any)._resolved_client_id = newCp.client_id;
  }

  // Validar fecha futura
  const bookingDt = new Date(`${booking_date}T${start_time}`);
  if (bookingDt <= new Date()) {
    return res.status(400).json({ error: "No puedes reservar en fechas u horas pasadas" });
  }

  // Verificar si el slot ya está tomado
  const { data: conflict } = await supabase
    .from("bookings")
    .select("booking_id")
    .eq("field_id", field_id)
    .eq("booking_date", booking_date)
    .eq("start_time", start_time)
    .not("booking_status", "in", "(cancelled)")
    .maybeSingle();

  if (conflict) {
    return res.status(409).json({ error: "Este horario ya no está disponible" });
  }

  // Obtener precio de la cancha y provider
  const { data: field } = await supabase
    .from("fields")
    .select("price_per_hour, facilities(provider_id)")
    .eq("field_id", field_id)
    .single();

  if (!field) return res.status(404).json({ error: "Cancha no encontrada" });

  // Calcular duración y precio
  const [startH] = start_time.split(":").map(Number);
  const [endH] = end_time.split(":").map(Number);
  const durationHours = endH - startH;
  let totalPrice = Number(field.price_per_hour) * durationHours;
  let discountApplied = 0;
  const providerId = (field.facilities as any)?.provider_id;

  // Aplicar código promocional si existe
  if (promo_code) {
    const { data: promo } = await supabase
      .from("promotional_codes")
      .select("*")
      .eq("code", promo_code.toUpperCase())
      .eq("is_active", true)
      .gte("valid_until", new Date().toISOString().split("T")[0])
      .single();

    if (promo) {
      if (promo.discount_type === "percentage") {
        discountApplied = totalPrice * (Number(promo.discount_value) / 100);
        if (promo.max_discount_value) discountApplied = Math.min(discountApplied, Number(promo.max_discount_value));
      } else {
        discountApplied = Number(promo.discount_value);
      }
      // Incrementar uso del código
      await supabase.from("promotional_codes").update({ usage_count: (promo.usage_count ?? 0) + 1 }).eq("promo_code_id", promo.promo_code_id);
    }
  }

  const finalPrice = Math.max(0, totalPrice - discountApplied);
  const qrToken = `QR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // Crear la reserva
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      client_id,
      field_id,
      provider_id: providerId,
      booking_date,
      start_time,
      end_time,
      duration_hours: durationHours,
      number_of_players: number_of_players ?? null,
      booking_status: "confirmed",
      total_price: totalPrice,
      discount_applied: discountApplied,
      final_price: finalPrice,
      notes: notes ?? null,
      qr_code_token: qrToken,
    })
    .select("booking_id")
    .single();

  if (bookingErr) return res.status(500).json({ error: bookingErr.message });

  // Crear registro de pago pendiente
  await supabase.from("payments").insert({
    booking_id: booking.booking_id,
    client_id,
    provider_id: providerId,
    payment_method_id: payment_method_id ?? null,
    amount: finalPrice,
    currency: "HNL",
    payment_status: "pending",
  });

  // Marcar time_slot como no disponible (si existe)
  await supabase
    .from("time_slots")
    .update({ is_available: false, booking_id: booking.booking_id })
    .eq("field_id", field_id)
    .eq("slot_date", booking_date)
    .eq("start_time", start_time);

  // Actualizar estadísticas del cliente
  await supabase.rpc("increment_client_bookings", { p_client_id: client_id });

  // Crear notificación de confirmación
  await supabase.from("notifications").insert({
    user_id,
    notification_type: "booking_confirmation",
    title: "Reserva Confirmada",
    message: `Tu reserva ha sido confirmada para el ${booking_date} a las ${start_time}. QR: ${qrToken}`,
    data: { booking_id: booking.booking_id },
    notification_channel: "in_app",
  });

  // Log de actividad
  await supabase.from("activity_logs").insert({
    user_id,
    action_type: "CREATE",
    entity_type: "booking",
    entity_id: booking.booking_id,
    new_values: { booking_date, start_time, end_time, field_id },
  });

  res.status(201).json({
    message: "Reserva creada exitosamente",
    booking_id: booking.booking_id,
    qr_code_token: qrToken,
    final_price: finalPrice,
  });
});

// ─── POST /bookings/:id/cancel ────────────────────────────────────────────────
router.post("/:id/cancel", async (req: AuthRequest, res) => {
  const { reason } = req.body;
  const { client_id, user_id } = req.authUser!;

  if (!reason?.trim()) {
    return res.status(400).json({ error: "Se requiere una razón de cancelación" });
  }

  // Verificar que la reserva pertenece al usuario
  const { data: booking } = await supabase
    .from("bookings")
    .select("booking_id, booking_status, booking_date, start_time, field_id")
    .eq("booking_id", req.params.id)
    .eq("client_id", client_id!)
    .single();

  if (!booking) return res.status(404).json({ error: "Reserva no encontrada" });
  if (booking.booking_status === "cancelled") return res.status(400).json({ error: "La reserva ya fue cancelada" });
  if (booking.booking_status === "completed") return res.status(400).json({ error: "No puedes cancelar una reserva completada" });

  // Actualizar reserva
  const { error } = await supabase
    .from("bookings")
    .update({
      booking_status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: "client",
      cancelled_at: new Date().toISOString(),
    })
    .eq("booking_id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  // Liberar el time_slot
  await supabase
    .from("time_slots")
    .update({ is_available: true, booking_id: null })
    .eq("booking_id", req.params.id);

  // Actualizar pago a reembolso pendiente
  await supabase.from("payments").update({ payment_status: "refunded" }).eq("booking_id", req.params.id);

  // Notificación
  await supabase.from("notifications").insert({
    user_id,
    notification_type: "booking_cancellation",
    title: "Reserva Cancelada",
    message: `Tu reserva del ${booking.booking_date} a las ${booking.start_time} fue cancelada.`,
    data: { booking_id: booking.booking_id },
    notification_channel: "in_app",
  });

  res.json({ message: "Reserva cancelada exitosamente" });
});

// ─── POST /bookings/:id/rate ──────────────────────────────────────────────────
router.post("/:id/rate", async (req: AuthRequest, res) => {
  const { rating } = req.body;
  const { client_id } = req.authUser!;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating debe ser entre 1 y 5" });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("booking_id, field_id, booking_status")
    .eq("booking_id", req.params.id)
    .eq("client_id", client_id!)
    .single();

  if (!booking) return res.status(404).json({ error: "Reserva no encontrada" });

  // Insertar calificación
  const { error } = await supabase.from("field_ratings").insert({
    field_id: booking.field_id,
    booking_id: booking.booking_id,
    client_id,
    rating,
    is_verified_booking: true,
  });

  if (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Ya calificaste esta reserva" });
    return res.status(500).json({ error: error.message });
  }

  // Recalcular rating promedio del field
  const { data: ratings } = await supabase
    .from("field_ratings")
    .select("rating")
    .eq("field_id", booking.field_id);

  if (ratings) {
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    await supabase.from("fields").update({ rating: avg.toFixed(2), review_count: ratings.length }).eq("field_id", booking.field_id);
  }

  res.json({ message: "Calificación registrada exitosamente" });
});

export default router;
