/**
 * routes/notifications.ts
 */
import { Router } from "express";
import { supabase } from "../db/client.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const { user_id } = req.authUser!;
  const { data, error } = await supabase
    .from("notifications")
    .select("notification_id, notification_type, title, message, is_read, sent_at, data")
    .eq("user_id", user_id)
    .order("sent_at", { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ notifications: data ?? [] });
});

router.put("/:id/read", async (req: AuthRequest, res) => {
  const { user_id } = req.authUser!;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("notification_id", req.params.id)
    .eq("user_id", user_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Notificación marcada como leída" });
});

router.put("/read-all", async (req: AuthRequest, res) => {
  const { user_id } = req.authUser!;
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user_id)
    .eq("is_read", false);
  res.json({ message: "Todas las notificaciones marcadas como leídas" });
});

export default router;
