import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppTheme } from "@/constants/theme";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

interface PaymentMethod {
  id: number;
  type: "visa" | "mastercard" | "amex";
  lastFour: string;
  expiry: string;
  holderName: string;
  isDefault: boolean;
}

// Colores de tarjeta usando la paleta de ATHLO
const CARD_COLORS: Record<string, [string, string]> = {
  visa:       [C.primary,      "#0A4A8F"],   // Azul marino
  mastercard: ["#B91C1C",      "#991B1B"],   // Rojo
  amex:       [C.accent,       C.accentDark], // Cyan Athlo
};

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([
    { id: 1, type: "visa", lastFour: "4532", expiry: "12/25", holderName: "Usuario Athlo", isDefault: true },
    { id: 2, type: "mastercard", lastFour: "8765", expiry: "08/26", holderName: "Usuario Athlo", isDefault: false },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const setDefault = (id: number) =>
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));

  const removeCard = (id: number) => {
    Alert.alert("Eliminar Tarjeta", "¿Estás seguro que deseas eliminar esta tarjeta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => setMethods((prev) => prev.filter((m) => m.id !== id)),
      },
    ]);
  };

  const formatCardNumber = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 16);
    return nums.match(/.{1,4}/g)?.join(" ") ?? nums;
  };

  const formatExpiry = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 4);
    if (nums.length >= 3) return nums.slice(0, 2) + "/" + nums.slice(2);
    return nums;
  };

  const detectType = (num: string): "visa" | "mastercard" | "amex" => {
    const clean = num.replace(/\s/g, "");
    if (clean.startsWith("4")) return "visa";
    if (clean.startsWith("5")) return "mastercard";
    return "amex";
  };

  const handleAddCard = () => {
    const clean = cardNumber.replace(/\s/g, "");
    if (clean.length < 16 || !holderName || expiry.length < 5 || cvv.length < 3) {
      Alert.alert("Error", "Por favor completa todos los campos correctamente");
      return;
    }
    setMethods((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: detectType(cardNumber),
        lastFour: clean.slice(-4),
        expiry,
        holderName,
        isDefault: prev.length === 0,
      },
    ]);
    setShowModal(false);
    setCardNumber(""); setHolderName(""); setExpiry(""); setCvv("");
    Alert.alert("¡Listo!", "Tarjeta agregada exitosamente");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="card-outline" size={18} color={C.accent} />
          <Text style={styles.headerTitle}>Métodos de Pago</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color={C.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Tarjetas ────────────────────────── */}
        <View style={styles.sectionLabelRow}>
          <Ionicons name="wallet-outline" size={15} color={C.textMuted} />
          <Text style={styles.sectionLabel}>Mis tarjetas</Text>
        </View>
        {methods.map((m) => {
          const [colorFrom, colorTo] = CARD_COLORS[m.type];
          return (
            <View key={m.id} style={[styles.card, { backgroundColor: colorFrom }]}>
              {/* Decoraciones de fondo */}
              <View style={[styles.cardCircle1, { backgroundColor: colorTo }]} />
              <View style={[styles.cardCircle2, { backgroundColor: colorTo + "60" }]} />

              {/* Top row */}
              <View style={styles.cardTop}>
                <View style={styles.cardChip}>
                  <View style={styles.chipInner} />
                </View>
                <View style={styles.cardTopRight}>
                  {m.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Ionicons name="checkmark-circle" size={10} color="#fff" />
                      <Text style={styles.defaultBadgeText}>Principal</Text>
                    </View>
                  )}
                  <Text style={styles.cardTypeLabel}>{m.type.toUpperCase()}</Text>
                </View>
              </View>

              {/* Número */}
              <Text style={styles.cardNumber}>•••• •••• •••• {m.lastFour}</Text>

              {/* Bottom row */}
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.cardMeta}>Titular</Text>
                  <Text style={styles.cardMetaValue}>{m.holderName}</Text>
                </View>
                <View>
                  <Text style={styles.cardMeta}>Vence</Text>
                  <Text style={styles.cardMetaValue}>{m.expiry}</Text>
                </View>
              </View>

              {/* Acciones */}
              <View style={styles.cardActions}>
                {!m.isDefault && (
                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => setDefault(m.id)}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.cardActionText}>Hacer principal</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cardActionBtn} onPress={() => removeCard(m.id)}>
                  <Ionicons name="trash-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.cardActionText, { color: "rgba(255,255,255,0.8)" }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Agregar tarjeta */}
        <TouchableOpacity style={styles.addCardBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle-outline" size={22} color={C.accent} />
          <Text style={styles.addCardText}>Agregar nueva tarjeta</Text>
        </TouchableOpacity>

        {/* Otros métodos */}
        <View style={styles.sectionLabelRow}>
          <Ionicons name="swap-horizontal-outline" size={15} color={C.textMuted} />
          <Text style={styles.sectionLabel}>Otros métodos</Text>
        </View>
        {[
          {
            icon: "cash-outline" as const,
            label: "Efectivo al llegar",
            sub: "Paga directamente en la cancha",
            color: C.success,
            bg: C.successSoft,
          },
          {
            icon: "swap-horizontal-outline" as const,
            label: "Transferencia bancaria",
            sub: "BAC, Ficohsa, Atlántida",
            color: C.accent,
            bg: C.accentLight,
          },
        ].map((alt) => (
          <View key={alt.label} style={styles.altCard}>
            <View style={[styles.altIconBg, { backgroundColor: alt.bg }]}>
              <Ionicons name={alt.icon} size={22} color={alt.color} />
            </View>
            <View style={styles.altInfo}>
              <Text style={styles.altLabel}>{alt.label}</Text>
              <Text style={styles.altSub}>{alt.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textSoft} />
          </View>
        ))}
      </ScrollView>

      {/* ── Modal agregar tarjeta ────────────── */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalWrapper}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalPill} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="add-circle-outline" size={18} color={C.accent} />
                <Text style={styles.modalTitle}>Nueva Tarjeta</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            <Field
              label="Número de tarjeta"
              value={formatCardNumber(cardNumber)}
              onChangeText={(v) => setCardNumber(v)}
              placeholder="1234 5678 9012 3456"
              keyboardType="numeric"
              icon="card-outline"
            />
            <Field
              label="Nombre del titular"
              value={holderName}
              onChangeText={setHolderName}
              placeholder="Como aparece en la tarjeta"
              autoCapitalize="characters"
              icon="person-outline"
            />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Field
                  label="Vencimiento"
                  value={expiry}
                  onChangeText={(v) => setExpiry(formatExpiry(v))}
                  placeholder="MM/AA"
                  keyboardType="numeric"
                  icon="calendar-outline"
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="CVV"
                  value={cvv}
                  onChangeText={(v) => setCvv(v.slice(0, 4))}
                  placeholder="•••"
                  keyboardType="numeric"
                  secureTextEntry
                  icon="lock-closed-outline"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddCard} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Agregar Tarjeta</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <View style={styles.fieldInputRow}>
        <Ionicons name={props.icon} size={16} color={C.accent} />
        <TextInput
          style={styles.fieldInput}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize ?? "none"}
          secureTextEntry={props.secureTextEntry}
          placeholderTextColor={C.textSoft}
        />
      </View>
    </View>
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
    width: 36, height: 36, justifyContent: "center", alignItems: "center",
    borderRadius: 18, backgroundColor: C.accentLight,
  },
  headerTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { fontSize: T.heading, fontWeight: "800", color: C.primary },
  addBtn: {
    width: 36, height: 36, justifyContent: "center", alignItems: "center",
    borderRadius: 18, backgroundColor: C.accentLight,
  },

  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: C.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 12, marginTop: 4, paddingLeft: 2,
  },

  // Credit card
  card: {
    borderRadius: R.xl, padding: 20, marginBottom: 14,
    ...AppTheme.shadow.strong,
    overflow: "hidden", position: "relative",
  },
  cardCircle1: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    top: -60, right: -40, opacity: 0.4,
  },
  cardCircle2: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    bottom: -30, left: -20,
  },
  cardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 20,
  },
  cardChip: {
    width: 34, height: 26, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  chipInner: {
    width: 22, height: 16, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardTopRight: { alignItems: "flex-end", gap: 6 },
  defaultBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.xxl,
  },
  defaultBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardTypeLabel: {
    color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", letterSpacing: 2,
  },
  cardNumber: {
    color: "#fff", fontSize: 18, fontWeight: "600",
    letterSpacing: 2.5, marginBottom: 16,
  },
  cardBottom: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 14,
  },
  cardMeta: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginBottom: 2 },
  cardMetaValue: { color: "#fff", fontSize: 13, fontWeight: "600" },
  cardActions: {
    flexDirection: "row", gap: 18,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 12,
  },
  cardActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardActionText: { color: "rgba(255,255,255,0.9)", fontSize: 12 },

  // Add card button
  addCardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: C.accent, borderStyle: "dashed",
    borderRadius: R.lg, paddingVertical: 16, marginBottom: 24,
    backgroundColor: C.accentLight,
  },
  addCardText: { color: C.accentDark, fontWeight: "700", fontSize: T.body },

  // Alt methods
  altCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.white,
    borderRadius: R.md, padding: 14, marginBottom: 10,
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
  },
  altIconBg: {
    width: 44, height: 44, borderRadius: R.sm,
    justifyContent: "center", alignItems: "center",
  },
  altInfo: { flex: 1 },
  altLabel: { fontSize: T.body, fontWeight: "600", color: C.text },
  altSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },

  // Modal
  modalWrapper: { flex: 1, justifyContent: "flex-end", backgroundColor: C.overlay },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    padding: 24, paddingTop: 12,
  },
  modalPill: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: "center", marginBottom: 18,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontSize: T.heading, fontWeight: "800", color: C.primary },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.inputBg,
    justifyContent: "center", alignItems: "center",
  },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: T.small, fontWeight: "600", color: C.text, marginBottom: 6 },
  fieldInputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.inputBg,
    borderRadius: R.sm, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: C.border,
  },
  fieldInput: { flex: 1, fontSize: T.body, color: C.text },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldHalf: { flex: 1 },

  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: R.md, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
    flexDirection: "row", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: T.body, fontWeight: "700" },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
});
