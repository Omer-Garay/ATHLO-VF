# Athlo — App de Reserva de Canchas Deportivas

Stack completo: **React Native (Expo Router)** + **Backend Express/Node** + **Supabase PostgreSQL**

---

## 📁 Estructura del proyecto

```
athlo-rn/
├── app/                    # Expo Router (pantallas)
│   ├── auth/
│   │   └── login.tsx       # Login / Registro
│   ├── tabs/
│   │   ├── index.tsx       # Home — canchas destacadas y populares
│   │   ├── reservas.tsx    # Mis reservas (activas e historial)
│   │   └── perfil.tsx      # Perfil del usuario
│   └── screens/
│       ├── reserve.tsx     # Flujo completo de reserva
│       ├── all-courts.tsx  # Lista de canchas con filtros
│       ├── admin.tsx       # Panel administrador/proveedor
│       ├── payment-methods.tsx
│       └── settings.tsx
├── services/               # Capa de llamadas al backend
│   ├── auth.service.ts
│   ├── courts.service.ts
│   ├── bookings.service.ts
│   ├── notifications.service.ts
│   └── admin.service.ts
├── lib/
│   ├── supabase.ts         # Cliente Supabase para RN
│   └── api.ts              # authenticatedFetch con auto-refresh JWT
├── constants/
│   └── theme.ts            # Colores, tipografía, spacing
└── backend/                # API REST Express
    ├── server.ts           # Entrada principal
    ├── db/client.ts        # Supabase con SERVICE_ROLE_KEY
    ├── middleware/auth.ts  # JWT validation + role guard
    └── routes/
        ├── auth.ts         # /auth/signup, /auth/me
        ├── courts.ts       # /courts (featured, popular, slots)
        ├── bookings.ts     # /bookings (crear, cancelar, calificar)
        ├── notifications.ts
        └── admin.ts        # /admin (stats, courts, bookings, payouts)
```

---

## 🚀 Setup en 5 pasos

### 1. Clonar e instalar dependencias

```bash
# Frontend (React Native)
npm install
npx expo install expo-image-picker

# Backend
cd backend && npm install
```

### 2. Configurar Supabase

Ve a [supabase.com](https://supabase.com) → Tu proyecto → **Settings → API** y copia:
- **Project URL** → `SUPABASE_URL`
- **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** (secreto) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Variables de entorno

**Frontend** — crea `.env` en la raíz del proyecto RN:
```env
EXPO_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_BASE_URL=http://IP WIFI:3000
```

**Backend** — crea `backend/.env`:
```env
SUPABASE_URL=https://tuproyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3000
```
### Modificar supabase.ts
Agregar los valores 
EXPO_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_BASE_URL=http://IP WIFI:3000

### 4. Ejecutar en desarrollo

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — App móvil
npx expo start
```

### 5. Abrir en dispositivo
- Escanea el QR con **Expo Go** (Android/iOS)
- O presiona `a` para Android Emulator / `i` para iOS Simulator

---

## 🗄️ Base de datos

El backend se conecta directamente a tu esquema PostgreSQL en Supabase:

| Tabla | Uso |
|---|---|
| `users` | Todos los usuarios del sistema |
| `client_profiles` | Perfil de clientes (compradores) |
| `provider_profiles` | Perfil de proveedores (dueños de canchas) |
| `facilities` | Instalaciones/complejos deportivos |
| `fields` | Canchas individuales dentro de una instalación |
| `sport_types` | Catálogo de deportes |
| `field_operating_hours` | Horarios por día de la semana |
| `time_slots` | Slots de disponibilidad pre-generados |
| `bookings` | Reservas (con QR token, descuentos, recurrencia) |
| `payments` | Pagos asociados a reservas |
| `payment_methods` | Tarjetas guardadas del cliente |
| `notifications` | Notificaciones in-app |
| `promotional_codes` | Códigos de descuento |
| `provider_payouts` | Pagos a proveedores |
| `field_ratings` | Calificaciones de canchas |
| `activity_logs` | Auditoría de acciones |

---

## 🔐 Autenticación

```
Usuario → Supabase Auth (email+password) → JWT
         ↓
Expo App → inyecta JWT en Authorization: Bearer {token}
         ↓
Backend → supabase.auth.getUser(token) → válido
        → busca en public.users por email
        → adjunta user_id, user_type, client_id, provider_id al request
```

---

## 📱 Características incluidas

- ✅ Login / Registro con Supabase Auth
- ✅ Home con canchas destacadas y populares
- ✅ Filtro por deporte (Fútbol, Pádel, Tenis, Básquet...)
- ✅ Búsqueda de canchas
- ✅ Detalle de cancha con galería, amenidades, rating
- ✅ Selección de fecha (14 días) con slots dinámicos
- ✅ Selector de número de jugadores
- ✅ Método de pago (efectivo, tarjeta, transferencia)
- ✅ Confirmación con QR token
- ✅ Lista de reservas activas e historial
- ✅ Cancelación de reservas con razón
- ✅ Calificación de reservas completadas
- ✅ Panel administrador/proveedor (stats, canchas, reservas, finanzas)
- ✅ Toggle de disponibilidad de canchas
- ✅ Métodos de pago (agregar/eliminar tarjetas)
- ✅ Notificaciones in-app
- ✅ Ajustes de notificaciones
- ✅ Soporte para roles: client / provider / admin
- ✅ Códigos promocionales (backend)
- ✅ Log de actividades (auditoría)
