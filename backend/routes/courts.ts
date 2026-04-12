/**
 * routes/courts.ts
 *
 * FIX principal: GET /courts/:id/slots
 * El endpoint original usaba .single() para field_operating_hours,
 * que falla si hay 0 ó >1 registros. Ahora usa .maybeSingle() y
 * si no hay horarios definidos genera slots de 6:00 a 23:00.
 * También cruza con bookings existentes para marcar slots ocupados.
 */
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

const COURT_SELECT = `
  field_id, field_name, surface_type, capacity, price_per_hour,
  is_available, is_premium, description, image_url, rating, review_count,
  facilities (
    facility_name, address, city, state_province, country,
    latitude, longitude, has_lighting, has_changing_rooms,
    parking_available, wifi_available
  ),
  sport_types (sport_name, icon_url)
`;

const flattenCourt = (c: any) => ({
  field_id: c.field_id,
  field_name: c.field_name,
  sport_name: c.sport_types?.sport_name,
  price_per_hour: Number(c.price_per_hour),
  rating: Number(c.rating ?? 0),
  review_count: c.review_count ?? 0,
  image_url: c.image_url,
  is_available: c.is_available,
  is_premium: c.is_premium,
  surface_type: c.surface_type,
  capacity: c.capacity,
  description: c.description,
  facility_name: c.facilities?.facility_name,
  city: c.facilities?.city,
  address: c.facilities?.address,
  latitude: c.facilities?.latitude,
  longitude: c.facilities?.longitude,
  has_lighting: c.facilities?.has_lighting ?? false,
  has_changing_rooms: c.facilities?.has_changing_rooms ?? false,
  parking_available: c.facilities?.parking_available ?? false,
  wifi_available: c.facilities?.wifi_available ?? false,
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const { sport } = req.query;
  let query = supabase.from("fields").select(COURT_SELECT).eq("is_available", true).order("rating", { ascending: false });

  if (sport && sport !== "Todos") {
    // Busca el deporte por nombre exacto o parcial (insensible a mayúsculas y acentos)
    const { data: sportTypes } = await supabase
      .from("sport_types")
      .select("sport_type_id, sport_name");

    // Normalizar texto: quitar acentos y pasar a minúsculas para comparar
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const sportNorm = normalize(String(sport));
    const match = (sportTypes ?? []).find((st: any) =>
      normalize(st.sport_name).includes(sportNorm) ||
      sportNorm.includes(normalize(st.sport_name))
    );

    if (match) {
      query = query.eq("sport_type_id", match.sport_type_id);
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ courts: (data ?? []).map(flattenCourt) });
});

router.get("/featured", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("fields").select(COURT_SELECT).eq("is_available", true).eq("is_premium", true).order("rating", { ascending: false }).limit(6);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ courts: (data ?? []).map(flattenCourt) });
});

router.get("/popular", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("fields").select(COURT_SELECT).eq("is_available", true).order("review_count", { ascending: false }).order("rating", { ascending: false }).limit(10);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ courts: (data ?? []).map(flattenCourt) });
});

router.get("/search", requireAuth, async (req: AuthRequest, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Parámetro q requerido" });
  const { data, error } = await supabase.from("fields").select(COURT_SELECT).eq("is_available", true).ilike("field_name", `%${q}%`);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ courts: (data ?? []).map(flattenCourt) });
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { data, error } = await supabase.from("fields").select(COURT_SELECT).eq("field_id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Cancha no encontrada" });
  res.json({ court: flattenCourt(data) });
});

// ─── GET /courts/:id/slots ────────────────────────────────────────────────────
router.get("/:id/slots", requireAuth, async (req: AuthRequest, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Parámetro date requerido (YYYY-MM-DD)" });

  const fieldId = req.params.id;
  const dateStr = date as string;

  // Día de la semana (0=Dom ... 6=Sab)
  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();

  // FIX: usar maybeSingle() en lugar de single() para evitar crash cuando
  // no hay horarios definidos o hay múltiples registros
  const { data: hours } = await supabase
    .from("field_operating_hours")
    .select("opening_time, closing_time, is_closed")
    .eq("field_id", fieldId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  //No existe el registro en la BD para ese día (Día no configurado)
  if (!hours) {
    return res.json({ 
      slots: [], 
      is_closed_day: true, 
      message: "Horarios no configurados para este día" 
    });
  }

  // Si el día está marcado como cerrado → devolver array vacío
  if (hours?.is_closed) {
  return res.json({ 
    slots: [], 
    is_closed_day: true, // <--- FIX: Esto le dirá al frontend que NO use el fallback
    message: "La cancha no opera este día" 
  });
}

  // Rango de horas: usa los de la BD si existen, sino default 06:00–23:00
  const opening = hours?.opening_time;
  const closing = hours?.closing_time;

  // Obtener bookings existentes para esa fecha y cancha (para marcar ocupados)
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("field_id", fieldId)
    .eq("booking_date", dateStr)
    .not("booking_status", "in", "(cancelled)");

  const bookedStarts = new Set((existingBookings ?? []).map((b: any) => b.start_time.slice(0, 5)));

  // Generar slots dinámicamente desde operating hours
  const slots = generateHourlySlots(dateStr, opening, closing, bookedStarts);

  res.json({ slots, schedule: { opening_time: opening, closing_time: closing, day_of_week: dayOfWeek } });
});

function generateHourlySlots(date: string, opening: string, closing: string, bookedStarts: Set<string>) {
  const slots = [];
  const [startH] = opening.split(":").map(Number);
  const [endH]   = closing.split(":").map(Number);
  const now = new Date();
  // Requiere al menos 1 hora de anticipación para reservar
  const minBookingTime = new Date(now.getTime() + 60 * 60 * 1000);

  for (let h = startH; h < endH; h++) {
    const start    = `${String(h).padStart(2, "0")}:00`;
    const end      = `${String(h + 1).padStart(2, "0")}:00`;
    const slotDt   = new Date(`${date}T${start}`);
    const isPast   = slotDt <= minBookingTime;
    const isBooked = bookedStarts.has(start);

    slots.push({
      time_slot_id: h,
      slot_date: date,
      start_time: start,
      end_time: end,
      is_available: !isPast && !isBooked,
      booking_id: null,
    });
  }
  return slots;
}

export default router;
