-- ============================================================
-- ATHLO — SQL adicional para Supabase
-- Ejecuta esto en: supabase.com → Tu proyecto → SQL Editor
-- ============================================================

-- ─── 1. Función RPC: incrementar contador de reservas del cliente ─────────────
-- El backend la llama con: supabase.rpc('increment_client_bookings', { p_client_id })
CREATE OR REPLACE FUNCTION public.increment_client_bookings(p_client_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.client_profiles
  SET
    total_bookings = COALESCE(total_bookings, 0) + 1,
    updated_at     = NOW()
  WHERE client_id = p_client_id;
END;
$$;

-- ─── 2. Función RPC: actualizar gasto total del cliente ───────────────────────
CREATE OR REPLACE FUNCTION public.add_client_spending(p_client_id BIGINT, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.client_profiles
  SET
    total_spent = COALESCE(total_spent, 0) + p_amount,
    updated_at  = NOW()
  WHERE client_id = p_client_id;
END;
$$;

-- ─── 3. Tipos ENUM requeridos (si no existen aún) ─────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.user_type_enum AS ENUM ('client', 'provider', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status_enum AS ENUM ('pending', 'completed', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_type_enum AS ENUM ('credit_card', 'debit_card', 'cash', 'bank_transfer', 'digital_wallet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notif_channel_enum AS ENUM ('in_app', 'email', 'sms', 'push');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.unit_enum AS ENUM ('meters', 'feet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type_enum AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.promo_scope_enum AS ENUM ('all_fields', 'specific_provider', 'specific_field');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.participant_status_enum AS ENUM ('invited', 'confirmed', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status_enum AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_type_enum AS ENUM ('text', 'image', 'file', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gender_enum AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cancelled_by_enum AS ENUM ('client', 'provider', 'admin', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blocked_reason_enum AS ENUM ('maintenance', 'event', 'holiday', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 4. Datos iniciales: deportes ─────────────────────────────────────────────
INSERT INTO public.sport_types (sport_name, description, icon_url) VALUES
  ('Fútbol',   'Fútbol 5, 7 y 11',         NULL),
  ('Pádel',    'Pádel individual y dobles', NULL),
  ('Tenis',    'Tenis individual y dobles', NULL),
  ('Básquet',  'Baloncesto',                NULL),
  ('Béisbol',  'Béisbol y Softball',        NULL),
  ('Voleibol', 'Voleibol de cancha',        NULL)
ON CONFLICT (sport_name) DO NOTHING;

-- ─── 5. Row Level Security (RLS) — Políticas básicas ─────────────────────────
-- Habilitar RLS en tablas sensibles
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- El backend usa SERVICE_ROLE_KEY → bypasea RLS automáticamente.
-- Estas políticas aplican solo a peticiones directas desde el frontend con ANON_KEY.

-- Clientes solo ven sus propias reservas
CREATE POLICY "clients_own_bookings" ON public.bookings
  FOR ALL USING (
    client_id IN (
      SELECT cp.client_id FROM public.client_profiles cp
      JOIN public.users u ON u.user_id = cp.user_id
      WHERE u.email = auth.jwt() ->> 'email'
    )
  );

-- Usuarios solo ven sus propias notificaciones
CREATE POLICY "own_notifications" ON public.notifications
  FOR ALL USING (
    user_id IN (
      SELECT user_id FROM public.users
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- ─── 6. Índices de rendimiento ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_client    ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_field     ON public.bookings(field_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date      ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_time_slots_field   ON public.time_slots(field_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_fields_sport       ON public.fields(sport_type_id);
CREATE INDEX IF NOT EXISTS idx_fields_facility    ON public.fields(facility_id);
CREATE INDEX IF NOT EXISTS idx_users_email        ON public.users(email);

-- ─── Verificar que todo quedó bien ───────────────────────────────────────────
SELECT sport_type_id, sport_name FROM public.sport_types ORDER BY sport_type_id;
