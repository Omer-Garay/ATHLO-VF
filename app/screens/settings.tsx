import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppTheme } from "@/constants/theme";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

export default function SettingsScreen() {
  const [notifBooking, setNotifBooking] = useState(true);
  const [notifReminder, setNotifReminder] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifPayment, setNotifPayment] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="settings-outline" size={18} color={C.accent} />
          <Text style={styles.headerTitle}>Ajustes</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Notificaciones */}
        <SectionHeader icon="notifications-outline" title="Notificaciones" />
        <View style={styles.settingsCard}>
          <ToggleRow
            icon="checkmark-circle-outline"
            label="Confirmación de reservas"
            sublabel="Recibe confirmación al reservar"
            value={notifBooking}
            onToggle={setNotifBooking}
          />
          <ToggleRow
            icon="alarm-outline"
            label="Recordatorios"
            sublabel="1 hora antes de tu reserva"
            value={notifReminder}
            onToggle={setNotifReminder}
          />
          <ToggleRow
            icon="pricetag-outline"
            label="Promociones"
            sublabel="Descuentos y ofertas especiales"
            value={notifPromo}
            onToggle={setNotifPromo}
          />
          <ToggleRow
            icon="card-outline"
            label="Pagos"
            sublabel="Confirmación de transacciones"
            value={notifPayment}
            onToggle={setNotifPayment}
            isLast
          />
        </View>

        {/* Cuenta */}
        <SectionHeader icon="person-circle-outline" title="Cuenta" />
        <View style={styles.settingsCard}>
          <ActionRow
            icon="lock-closed-outline"
            label="Cambiar contraseña"
            sublabel="Actualiza tu contraseña de acceso"
            onPress={() => Alert.alert("Próximamente", "Esta función estará disponible pronto")}
          />
          <ActionRow
            icon="language-outline"
            label="Idioma"
            sublabel="Español (Honduras)"
            onPress={() => Alert.alert("Idioma", "Español")}
          />
          <ActionRow
            icon="phone-portrait-outline"
            label="Número de teléfono"
            sublabel="Agregar o actualizar"
            onPress={() => Alert.alert("Próximamente")}
            isLast
          />
        </View>

        {/* Legal */}
        <SectionHeader icon="document-text-outline" title="Legal y privacidad" />
        <View style={styles.settingsCard}>
          <ActionRow
            icon="shield-checkmark-outline"
            label="Política de privacidad"
            sublabel="Cómo usamos tus datos"
            onPress={() => Alert.alert("Próximamente")}
          />
          <ActionRow
            icon="document-outline"
            label="Términos de uso"
            sublabel="Condiciones del servicio"
            onPress={() => Alert.alert("Próximamente")}
            isLast
          />
        </View>

        <View style={styles.appInfo}>
          <View style={styles.appVersionRow}>
            <Ionicons name="phone-portrait-outline" size={14} color={C.textSoft} />
            <Text style={styles.appVersion}>Athlo v1.0.0 · Honduras</Text>
          </View>
          <Text style={styles.appCopy}>© 2024 Athlo. Todos los derechos reservados.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ToggleRow({
  icon, label, sublabel, value, onToggle, isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowIconBg}>
        <Ionicons name={icon} size={17} color={value ? C.accent : C.textMuted} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSublabel}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: C.border, true: C.accent + "80" }}
        thumbColor={value ? C.accent : C.textSoft}
        ios_backgroundColor={C.border}
      />
    </View>
  );
}

function ActionRow({
  icon, label, sublabel, onPress, isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowIconBg}>
        <Ionicons name={icon} size={17} color={C.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSublabel}>{sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textSoft} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36,
    justifyContent: "center", alignItems: "center",
    borderRadius: 18, backgroundColor: C.accentLight,
  },
  headerTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { fontSize: T.heading, fontWeight: "800", color: C.primary },

  content: { padding: 16, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 20, marginBottom: 8, paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: C.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2,
  },

  settingsCard: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
  },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowIconBg: {
    width: 36, height: 36, borderRadius: R.xs,
    backgroundColor: C.accentLight,
    justifyContent: "center", alignItems: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: T.body, color: C.text, fontWeight: "600" },
  rowSublabel: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  appInfo: { alignItems: "center", marginTop: 32 },
  appVersionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  appVersion: { fontSize: 12, color: C.textSoft },
  appCopy: { fontSize: 11, color: C.textSoft },
});
