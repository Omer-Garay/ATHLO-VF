/**
 * routes/payment-methods.ts
 * GET    /payment-methods          — Métodos del cliente
 * POST   /payment-methods          — Agregar método
 * PATCH  /payment-methods/:id/default — Establecer como predeterminado
 * DELETE /payment-methods/:id      — Eliminar método
 */
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const { client_id } = req.authUser!;
  if (!client_id) return res.json({ methods: [] });

  const { data, error } = await supabase
    .from("payment_methods")
    .select("payment_method_id, payment_type, card_last_four, card_expiry_month, card_expiry_year, card_holder_name, is_default, is_active")
    .eq("client_id", client_id)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ methods: data ?? [] });
});

router.post("/", async (req: AuthRequest, res) => {
  const { client_id } = req.authUser!;
  if (!client_id) return res.status(403).json({ error: "Solo clientes pueden agregar métodos de pago" });

  const { payment_type, card_last_four, card_expiry_month, card_expiry_year, card_holder_name, token_reference } = req.body;
  if (!payment_type) return res.status(400).json({ error: "payment_type es requerido" });

  // Si es el primero, marcarlo como predeterminado
  const { count } = await supabase
    .from("payment_methods")
    .select("*", { count: "exact", head: true })
    .eq("client_id", client_id)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      client_id,
      payment_type,
      card_last_four: card_last_four ?? null,
      card_expiry_month: card_expiry_month ?? null,
      card_expiry_year: card_expiry_year ?? null,
      card_holder_name: card_holder_name ?? null,
      token_reference: token_reference ?? null,
      is_default: (count ?? 0) === 0,
    })
    .select("payment_method_id")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ payment_method_id: data.payment_method_id, message: "Método de pago agregado" });
});

router.patch("/:id/default", async (req: AuthRequest, res) => {
  const { client_id } = req.authUser!;

  // Quitar predeterminado de todos
  await supabase.from("payment_methods").update({ is_default: false }).eq("client_id", client_id!);

  // Establecer el nuevo
  const { error } = await supabase
    .from("payment_methods")
    .update({ is_default: true })
    .eq("payment_method_id", req.params.id)
    .eq("client_id", client_id!);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Método predeterminado actualizado" });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const { client_id } = req.authUser!;

  const { error } = await supabase
    .from("payment_methods")
    .update({ is_active: false })
    .eq("payment_method_id", req.params.id)
    .eq("client_id", client_id!);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Método de pago eliminado" });
});

export default router;
