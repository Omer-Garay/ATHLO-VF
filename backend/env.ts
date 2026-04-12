/**
 * env.ts — DEBE ser el primer import en server.ts
 *
 * En ES Modules todos los imports se resuelven antes de ejecutar
 * cualquier código, por eso dotenv.config() dentro de server.ts
 * llega demasiado tarde. Al poner dotenv aquí y hacer que este
 * módulo sea el PRIMER import, las variables quedan disponibles
 * para todos los módulos que vengan después.
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carga el .env desde la misma carpeta que este archivo (backend/.env)
const result = config({ path: resolve(__dirname, ".env") });

if (result.error) {
  console.warn("⚠️  No se encontró backend/.env — usando variables del sistema.");
}

// Validar variables críticas con mensajes claros
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n❌ Variables de entorno faltantes:");
  missing.forEach((key) => console.error(`   • ${key}`));
  console.error("\n📋 Pasos para solucionarlo:");
  console.error("   1. Crea el archivo: backend/.env");
  console.error("   2. Copia el contenido de backend/.env.example");
  console.error("   3. Rellena con tus valores de Supabase:");
  console.error("      → supabase.com → Tu proyecto → Settings → API\n");
  process.exit(1);
}

console.log("✅ Variables de entorno cargadas correctamente");
