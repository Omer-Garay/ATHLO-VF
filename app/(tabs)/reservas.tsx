import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "@/constants/theme";
import { BookingsService, Booking } from "@/services/bookings.service";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

export default function ReservasScreen() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    try {
      const data = await BookingsService.getMyBookings();
      setBookings(data.bookings);
    } catch {
      Alert.alert("Error", "No se pudieron cargar las reservas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadBookings(); }, []);

  const isBookingPast = (b: Booking) => {
    const dt = new Date(`${b.booking_date}T${b.start_time}`);
    return dt < new Date();
  };

  const activeBookings = bookings.filter(
    (b) => (b.booking_status === "pending" || b.booking_status === "confirmed") && !isBookingPast(b)
  );
  const historyBookings = bookings.filter(
    (b) => b.booking_status === "cancelled" || b.booking_status === "completed" || isBookingPast(b)
  );

  const handleCancelPress = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelReason("");
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      Alert.alert("Error", "Por favor ingresa una razón para cancelar");
      return;
    }
    setCancelling(true);
    try {
      await BookingsService.cancelBooking(selectedBooking.booking_id, cancelReason);
      setCancelModalVisible(false);
      Alert.alert("Listo", "Reserva cancelada exitosamente");
      loadBookings();
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo cancelar la reserva");
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-HN", { weekday: "short", day: "numeric", month: "short" });
  };

  const getStatusConfig = (b: Booking) => {
    if (b.booking_status === "cancelled")
      return { bg: C.dangerSoft, color: C.danger, label: "Cancelada", icon: "close-circle" as const };
    if (b.booking_status === "completed" || isBookingPast(b))
      return { bg: C.accentLight, color: C.accent, label: "Completada", icon: "checkmark-circle" as const };
    if (b.booking_status === "confirmed")
      return { bg: C.successSoft, color: C.success, label: "Confirmada", icon: "checkmark-circle" as const };
    return { bg: C.warningSoft, color: C.warning, label: "Pendiente", icon: "time" as const };
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const status = getStatusConfig(item);
    const canCancel =
      (item.booking_status === "pending" || item.booking_status === "confirmed") && !isBookingPast(item);

    return (
      <View style={styles.card}>
        {/* Barra de color de estado */}
        <View style={[styles.cardAccentBar, { backgroundColor: status.color }]} />

        <View style={styles.cardInner}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.courtName} numberOfLines={1}>{item.field_name}</Text>
              <Text style={styles.facilityName}>{item.facility_name} · {item.city}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={11} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoGrid}>
            <InfoChip icon="calendar-outline" text={formatDate(item.booking_date)} />
            <InfoChip icon="time-outline" text={`${item.start_time.slice(0, 5)} – ${item.end_time.slice(0, 5)}`} />
            <InfoChip icon="football-outline" text={item.sport_name} />
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.priceLabel}>Total pagado</Text>
              <Text style={styles.price}>L {item.final_price.toFixed(2)}</Text>
              {item.discount_applied > 0 && (
                <Text style={styles.discount}>Ahorraste L {item.discount_applied.toFixed(2)}</Text>
              )}
            </View>
            <View style={styles.footerActions}>
              {canCancel && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelPress(item)}>
                  <Ionicons name="close-circle-outline" size={14} color={C.danger} />
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}
              {item.booking_status === "completed" && (
                <TouchableOpacity style={styles.rateBtn}>
                  <Ionicons name="star-outline" size={14} color={C.primary} />
                  <Text style={styles.rateBtnText}>Calificar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* QR hint */}
          {item.qr_code_token && canCancel && (
            <View style={styles.qrHint}>
              <Ionicons name="qr-code-outline" size={14} color={C.accent} />
              <Text style={styles.qrHintText}>QR disponible para check-in</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const displayList = activeTab === "active" ? activeBookings : historyBookings;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Reservas</Text>
        <Text style={styles.headerSub}>
          {activeBookings.length} activa{activeBookings.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* ── Tabs ────────────────────────────────── */}
      <View style={styles.tabRow}>
        {(["active", "history"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            {activeTab === tab && tab === "active" && activeBookings.length > 0 && (
              <View style={styles.tabBubble}>
                <Text style={styles.tabBubbleText}>{activeBookings.length}</Text>
              </View>
            )}
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "active" ? "Activas" : "Historial"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => String(item.booking_id)}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={40} color={C.accent} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === "active" ? "Sin reservas activas" : "Sin historial aún"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "active"
                ? "Reserva una cancha desde el inicio"
                : "Tus reservas completadas aparecerán aquí"}
            </Text>
          </View>
        }
      />

      {/* ── Modal Cancelar ──────────────────────── */}
      <Modal visible={cancelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalPill} />
            <Text style={styles.modalTitle}>Cancelar Reserva</Text>
            <Text style={styles.modalSubtitle}>
              {selectedBooking?.field_name} · {selectedBooking && formatDate(selectedBooking.booking_date)}
            </Text>

            <Text style={styles.modalLabel}>¿Por qué cancelas?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe el motivo de la cancelación..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              placeholderTextColor={C.textSoft}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnDanger,
                  (!cancelReason.trim() || cancelling) && styles.btnDisabled,
                ]}
                onPress={handleConfirmCancel}
                disabled={!cancelReason.trim() || cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnDangerText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoChip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoChip}>
      <Ionicons name={icon} size={13} color={C.textMuted} />
      <Text style={styles.infoChipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4,
  },
  headerTitle: { fontSize: T.subtitle, fontWeight: "800", color: C.primary },
  headerSub: { fontSize: T.small, color: C.textMuted, marginTop: 2 },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20, marginTop: 14, marginBottom: 16,
    backgroundColor: C.inputBg,
    borderRadius: R.md, padding: 4,
    borderWidth: 1, borderColor: C.border,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: "center",
    borderRadius: R.sm, flexDirection: "row",
    justifyContent: "center", gap: 6,
  },
  tabActive: { backgroundColor: C.primary, ...AppTheme.shadow.card },
  tabText: { fontSize: T.small, fontWeight: "600", color: C.textMuted },
  tabTextActive: { color: "#fff" },
  tabBubble: {
    backgroundColor: C.highlight,
    borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 4,
  },
  tabBubbleText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    marginBottom: 14,
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardAccentBar: { width: 4 },
  cardInner: { flex: 1, padding: 14 },

  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 10,
  },
  cardHeaderLeft: { flex: 1, marginRight: 10 },
  courtName: { fontSize: T.body, fontWeight: "700", color: C.text },
  facilityName: { fontSize: T.small, color: C.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.xxl,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.inputBg,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.xs,
  },
  infoChipText: { fontSize: 12, color: C.textMuted },

  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10,
  },
  priceLabel: { fontSize: 10, color: C.textMuted },
  price: { fontSize: T.body, fontWeight: "700", color: C.primary },
  discount: { fontSize: 10, color: C.success, marginTop: 1 },
  footerActions: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: R.sm, borderWidth: 1, borderColor: C.danger,
  },
  cancelBtnText: { fontSize: 12, color: C.danger, fontWeight: "600" },
  rateBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: R.sm, borderWidth: 1, borderColor: C.primary,
  },
  rateBtnText: { fontSize: 12, color: C.primary, fontWeight: "600" },
  qrHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, backgroundColor: C.accentLight,
    padding: 8, borderRadius: R.xs,
  },
  qrHintText: { fontSize: 11, color: C.accentDark, fontWeight: "500" },

  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.accentLight,
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: T.body, fontWeight: "700", color: C.textMuted },
  emptySubtitle: {
    fontSize: T.small, color: C.textSoft,
    textAlign: "center", marginTop: 6, maxWidth: 240,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    padding: 24, paddingTop: 12,
  },
  modalPill: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: "center", marginBottom: 20,
  },
  modalTitle: { fontSize: T.heading, fontWeight: "700", color: C.text, marginBottom: 4 },
  modalSubtitle: { fontSize: T.small, color: C.textMuted, marginBottom: 20 },
  modalLabel: { fontSize: T.small, fontWeight: "600", color: C.text, marginBottom: 8 },
  modalInput: {
    backgroundColor: C.inputBg, borderRadius: R.sm,
    borderWidth: 1, borderColor: C.border,
    padding: 14, fontSize: T.body, color: C.text,
    textAlignVertical: "top", minHeight: 80, marginBottom: 20,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtnSecondary: {
    flex: 1, paddingVertical: 14, borderRadius: R.md,
    backgroundColor: C.inputBg, alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  modalBtnSecondaryText: { fontWeight: "600", color: C.textMuted, fontSize: T.body },
  modalBtnDanger: {
    flex: 1, paddingVertical: 14, borderRadius: R.md,
    backgroundColor: C.danger, alignItems: "center",
  },
  modalBtnDangerText: { fontWeight: "700", color: "#fff", fontSize: T.body },
  btnDisabled: { opacity: 0.5 },
});
