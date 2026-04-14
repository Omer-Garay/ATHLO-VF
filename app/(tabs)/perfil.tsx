import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { AppTheme } from "@/constants/theme";
import { webConfirm, webAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabase";
import { AuthService } from "@/services/auth.service";
import { ProfileService } from "@/services/profile.service";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
}

export default function PerfilScreen() {
  const [userName, setUserName]   = useState("Usuario Athlo");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole]   = useState("client");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [totalBookings, setTotalBookings] = useState(0);

  // useFocusEffect se ejecuta CADA VEZ que la pantalla recibe el foco:
  // - Al montarse por primera vez
  // - Al regresar desde edit-profile con router.back()
  // Esto resuelve que la foto/nombre no se actualice hasta reiniciar la app.
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    // Cargar datos básicos desde la sesión (rápido, sin esperar al backend)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const meta = session.user.user_metadata;
      if (meta?.name) setUserName(meta.name);
      setUserEmail(session.user.email ?? "");
      if (meta?.role) setUserRole(meta.role);
      // Pre-cargar avatar desde metadata de sesión para evitar parpadeo.
      // Esto muestra la foto inmediatamente mientras el backend responde.
      if (meta?.avatar_url && !avatarUrl) {
        setAvatarUrl(meta.avatar_url);
      }
    }
    // Cargar perfil completo desde el backend para obtener datos frescos
    try {
      const { user } = await ProfileService.getProfile();
      setUserName(`${user.first_name} ${user.last_name}`.trim());
      // Solo actualizar avatarUrl si el valor cambió realmente.
      // Comparamos la URL base sin el ?t= para no ciclar infinitamente.
      const newUrl = user.profile_image_url;
      const currentBase = avatarUrl?.split("?")[0] ?? null;
      const newBase     = newUrl?.split("?")[0] ?? null;
      if (newBase !== currentBase) {
        if (newUrl) {
          const bust = `?t=${Date.now()}`;
          setAvatarUrl(newUrl.split("?")[0] + bust);
        } else {
          setAvatarUrl(null); // El usuario borró su foto
        }
      }
    } catch { /* silencioso — mantiene datos actuales */ }
  };

  const handleLogout = async () => {
    const confirmed = await webConfirm(
      "Cerrar Sesión",
      "¿Estás seguro que deseas salir?"
    );
    if (confirmed) {
      await AuthService.logout();
    }
  };

  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: "Cuenta",
      items: [
        { icon: "create-outline", label: "Editar Perfil", sublabel: "Foto, nombre y datos personales", onPress: () => router.push("/screens/edit-profile"), accent: true },
        { icon: "card-outline", label: "Métodos de Pago", sublabel: "Tarjetas y billeteras", onPress: () => router.push("/screens/payment-methods") },
        { icon: "settings-outline", label: "Ajustes", sublabel: "Notificaciones y preferencias", onPress: () => router.push("/screens/settings") },
        ...(userRole === "admin" || userRole === "provider"
          ? [{ icon: "shield-checkmark-outline" as keyof typeof Ionicons.glyphMap, label: "Panel de Administración", sublabel: "Gestionar canchas y reservas", onPress: () => router.push("/screens/admin"), accent: true }]
          : []),
      ],
    },
    {
      title: "Soporte",
      items: [
        { icon: "help-circle-outline", label: "Centro de Ayuda", sublabel: "Preguntas frecuentes", onPress: () => Alert.alert("Soporte", "soporte@athlo.hn") },
        { icon: "chatbubble-outline", label: "Contactar Soporte", sublabel: "soporte@athlo.hn", onPress: () => Alert.alert("Soporte", "soporte@athlo.hn") },
      ],
    },
    {
      title: "Sesión",
      items: [
        { icon: "log-out-outline", label: "Cerrar Sesión", onPress: handleLogout, danger: true },
      ],
    },
  ];

  const initials = userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = userRole === "admin" ? "Administrador" : userRole === "provider" ? "Proveedor" : null;
  const getGroupIcon = (title: string): keyof typeof Ionicons.glyphMap =>
    title === "Cuenta"
      ? "person-circle-outline"
      : title === "Soporte"
        ? "help-buoy-outline"
        : "log-out-outline";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero de perfil ──────────────────────── */}
        <View style={styles.hero}>
          {/* Patrón decorativo de fondo */}
          <View style={styles.heroDecor1} />
          <View style={styles.heroDecor2} />

          <View style={styles.heroContent}>
            {/* Avatar con anillo de acento */}
            <TouchableOpacity style={styles.avatarRing} onPress={() => router.push("/screens/edit-profile")} activeOpacity={0.85}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>

            {roleLabel && (
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={11} color={C.accent} />
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            )}
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <StatItem icon="calendar-outline" label="Reservas" value={String(totalBookings)} />
            <View style={styles.statSep} />
            <StatItem icon="star-outline" label="Calificación" value="—" />
            <View style={styles.statSep} />
            <StatItem icon="location-outline" label="Ciudad" value="TGU" />
          </View>
        </View>

        {/* ── Grupos de menú ─────────────────────── */}
        <View style={styles.menuSection}>
          {menuGroups.map((group) => (
            <View key={group.title} style={styles.menuGroup}>
              <View style={styles.groupTitleRow}>
                <Ionicons name={getGroupIcon(group.title)} size={14} color={C.textMuted} />
                <Text style={styles.groupTitle}>{group.title}</Text>
              </View>
              <View style={styles.menuCard}>
                {group.items.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.menuItem,
                      idx < group.items.length - 1 && styles.menuItemBorder,
                    ]}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.menuIconBg,
                      item.danger && styles.menuIconDanger,
                      item.accent && styles.menuIconAccent,
                    ]}>
                      <Ionicons
                        name={item.icon}
                        size={19}
                        color={
                          item.danger ? C.danger
                          : item.accent ? C.accent
                          : C.primary
                        }
                      />
                    </View>
                    <View style={styles.menuTextBlock}>
                      <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                        {item.label}
                      </Text>
                      {item.sublabel && (
                        <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                      )}
                    </View>
                    {!item.danger && (
                      <Ionicons name="chevron-forward" size={16} color={C.textSoft} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.versionRow}>
          <Ionicons name="phone-portrait-outline" size={14} color={C.textSoft} />
          <Text style={styles.version}>Athlo v1.0.0 · Honduras</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={16} color={C.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },

  // Hero
  hero: {
    backgroundColor: C.primary,
    paddingBottom: 0,
    overflow: "hidden",
  },
  heroDecor1: {
    position: "absolute", top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(1,182,239,0.12)",
  },
  heroDecor2: {
    position: "absolute", bottom: 20, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(246,72,1,0.08)",
  },
  heroContent: { alignItems: "center", paddingTop: 20, paddingBottom: 20 },
  avatarRing: {
    padding: 4,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: C.accent,
    marginBottom: 14,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(1,182,239,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  avatarImg: {
    width: 90, height: 90, borderRadius: 45,
  },
  avatarEditBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.accent,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: C.primary,
  },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  userName: { fontSize: T.heading, fontWeight: "700", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: T.small, color: "rgba(255,255,255,0.6)" },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(1,182,239,0.15)",
    borderWidth: 1, borderColor: "rgba(1,182,239,0.3)",
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: R.xxl, marginTop: 10,
  },
  roleText: { fontSize: 12, fontWeight: "700", color: C.accent },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 20,
    borderRadius: R.lg,
    padding: 14,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: T.body, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.55)" },
  statSep: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },

  // Menu
  menuSection: { paddingHorizontal: 16, paddingTop: 20 },
  menuGroup: { marginBottom: 20 },
  groupTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, paddingLeft: 4 },
  groupTitle: {
    fontSize: 11, fontWeight: "700", color: C.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2,
  },
  menuCard: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  menuIconBg: {
    width: 38, height: 38, borderRadius: R.sm,
    backgroundColor: C.accentLight,
    justifyContent: "center", alignItems: "center",
  },
  menuIconDanger: { backgroundColor: C.dangerSoft },
  menuIconAccent: { backgroundColor: "rgba(1,182,239,0.12)" },
  menuTextBlock: { flex: 1 },
  menuLabel: { fontSize: T.body, color: C.text, fontWeight: "600" },
  menuLabelDanger: { color: C.danger },
  menuSublabel: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  versionRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 24, marginTop: 4 },
  version: { textAlign: "center", fontSize: 11, color: C.textSoft },
});
