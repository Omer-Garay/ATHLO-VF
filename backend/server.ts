/**
 * ATHLO BACKEND — servidor Express + Supabase PostgreSQL
 *
 * IMPORTANTE: env.ts DEBE ser el primer import.
 * En ES Modules los imports se hoistan antes de ejecutar código,
 * por eso dotenv.config() dentro del mismo archivo llega tarde.
 */

// 1️⃣  PRIMERO: cargar variables de entorno
import "./env.js";

// 2️⃣  DESPUÉS: todo lo demás
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import courtsRoutes from "./routes/courts.js";
import bookingsRoutes from "./routes/bookings.js";
import notificationsRoutes from "./routes/notifications.js";
import paymentMethodsRoutes from "./routes/payment-methods.js";
import adminRoutes from "./routes/admin.js";
import profileRoutes from "./routes/profile.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
// Permitir cualquier origen en desarrollo y producción.
// En producción puedes restringir a tu dominio de Vercel:
// origin: ["https://tu-app.vercel.app", "http://localhost:8081"]
app.use(cors({
  origin: true,  // Refleja el origen de la petición — más compatible que "*"
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
// Responder preflight OPTIONS explícitamente
app.options("*", cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use("/auth",            authRoutes);
app.use("/courts",          courtsRoutes);
app.use("/bookings",        bookingsRoutes);
app.use("/notifications",   notificationsRoutes);
app.use("/payment-methods", paymentMethodsRoutes);
app.use("/admin",           adminRoutes);
app.use("/profile",         profileRoutes);

// Health check
app.get("/health", (_, res) =>
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() })
);

// 404
app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Error handler global
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Error:", err.message ?? err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Error interno del servidor" });
});

// ─── Arrancar ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nAthlo API: http://localhost:${PORT}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL}`);
  console.log(`\nEndpoints disponibles:`);
  console.log(`  GET  /health`);
  console.log(`  POST /auth/signup`);
  console.log(`  POST /auth/sync          ← sincronizar usuario Auth con BD`);
  console.log(`  POST /auth/set-role      ← cambiar rol (solo admins)`);
  console.log(`  GET  /auth/me`);
  console.log(`  GET  /courts/featured`);
  console.log(`  GET  /courts/:id/slots?date=YYYY-MM-DD`);
  console.log(`  POST /bookings`);
  console.log(`  GET  /admin/stats`);
  console.log(`  GET  /admin/facilities`);
  console.log(`  GET  /admin/sport-types\n`);
});

export default app;
