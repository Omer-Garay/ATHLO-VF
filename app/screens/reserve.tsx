import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppTheme } from "@/constants/theme";
import { webAlert, webConfirm } from "@/lib/alert";
import { CourtsService, Court, TimeSlot } from "@/services/courts.service";
import { BookingsService } from "@/services/bookings.service";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo", icon: "cash-outline" },
  { id: "tarjeta", label: "Tarjeta", icon: "card-outline" },
  { id: "transferencia", label: "Transferencia", icon: "swap-horizontal-outline" },
];

export default function ReserveScreen() {
  const { courtId } = useLocalSearchParams<{ courtId: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [numPlayers, setNumPlayers] = useState(2);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (courtId) loadCourt();
  }, [courtId]);

  useEffect(() => {
    if (court) loadSlots();
  }, [selectedDate, court]);

  const loadCourt = async () => {
    try {
      const data = await CourtsService.getCourtById(Number(courtId));
      setCourt(data.court);
    } catch {
      webAlert("Error", "No se pudo cargar la cancha");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async () => {
    if (!courtId) return;

    setSlotsLoading(true);
    setIsClosed(false);
    setSelectedSlot(null);

    try {
      const data = await CourtsService.getAvailableSlots(Number(courtId), selectedDate);
      setIsClosed(!!data.is_closed_day);
      setTimeSlots(data.slots || []);
    } catch (error) {
      console.error("Error al cargar slots:", error);
      setTimeSlots([]);
      webAlert("Aviso", "No se pudieron sincronizar los horarios disponibles.");
      setIsClosed(true);
    } finally {
      setSlotsLoading(false);
    }
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today) return "Hoy";
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Mañana";

    return d.toLocaleDateString("es-HN", { weekday: "short", day: "numeric", month: "short" });
  };

  const handleBook = async () => {
    if (!selectedSlot || !court) return;

    const confirmed = await webConfirm(
      "Confirmar Reserva",
      `${court.field_name}\n${formatDateLabel(selectedDate)} · ${selectedSlot.start_time.slice(0, 5)} - ${selectedSlot.end_time.slice(0, 5)}\n\nTotal: L ${court.price_per_hour.toFixed(2)}`
    );
    if (!confirmed) return;

    setBookingLoading(true);
    try {
      await BookingsService.createBooking({
        field_id: court.field_id,
        booking_date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        number_of_players: numPlayers,
      });
      webAlert("¡Reserva confirmada!", "Tu cancha ha sido reservada exitosamente.");
      router.replace("/(tabs)/reservas");
    } catch (err: any) {
      webAlert("Error", err.message || "No se pudo crear la reserva");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading || !court) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  const filteredSlots = timeSlots.map((slot) => {
    const slotDt = new Date(`${slot.slot_date}T${slot.start_time}`);
    return {
      ...slot,
      is_available: slot.is_available && slotDt > oneHourFromNow,
    };
  });
  const availableSlots = filteredSlots.filter((slot) => slot.is_available).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {court.field_name}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: court.image_url ?? "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800" }}
          style={styles.courtImage}
        />

        <View style={styles.mainCard}>
          <View style={styles.courtHeader}>
            <View style={styles.courtHeaderLeft}>
              <Text style={styles.courtName}>{court.field_name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={C.textMuted} />
                <Text style={styles.locationText}>{court.address}, {court.city}</Text>
              </View>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.priceBoxAmount}>L {court.price_per_hour.toFixed(0)}</Text>
              <Text style={styles.priceBoxUnit}>/hora</Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name="star"
                size={14}
                color={star <= Math.round(court.rating) ? C.starColor : C.border}
              />
            ))}
            <Text style={styles.ratingText}>
              {court.rating.toFixed(1)} · {court.review_count} reseñas
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <AmenityBadge icon="football-outline" label={court.sport_name} />
            {court.surface_type && <AmenityBadge icon="layers-outline" label={court.surface_type} />}
            {court.has_lighting && <AmenityBadge icon="flashlight-outline" label="Iluminación" />}
            {court.parking_available && <AmenityBadge icon="car-outline" label="Parking" />}
            {court.has_changing_rooms && <AmenityBadge icon="shirt-outline" label="Vestidores" />}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>
            <Ionicons name="calendar-outline" size={15} color={C.primary} /> Selecciona la fecha
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {generateDateOptions().map((date) => {
              const isSelected = selectedDate === date;
              return (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                >
                  <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                    {formatDateLabel(date)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.slotsHeader}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="time-outline" size={15} color={C.primary} /> Horarios disponibles
            </Text>
            {!slotsLoading && !isClosed && (
              <Text style={styles.slotsCount}>{availableSlots} disponibles</Text>
            )}
          </View>

          {slotsLoading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
          ) : isClosed ? (
            <View style={styles.closedContainer}>
              <Ionicons name="calendar-outline" size={42} color={C.textMuted} />
              <Text style={styles.closedText}>Esta cancha no opera hoy</Text>
              <Text style={styles.closedSubtext}>Prueba seleccionando otra fecha disponible.</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {filteredSlots.map((slot) => {
                const isSelected = selectedSlot?.time_slot_id === slot.time_slot_id;
                return (
                  <TouchableOpacity
                    key={slot.time_slot_id}
                    style={[
                      styles.slotBtn,
                      !slot.is_available && styles.slotBtnDisabled,
                      isSelected && styles.slotBtnActive,
                    ]}
                    onPress={() => slot.is_available && setSelectedSlot(slot)}
                    disabled={!slot.is_available}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        !slot.is_available && styles.slotTextDisabled,
                        isSelected && styles.slotTextActive,
                      ]}
                    >
                      {slot.start_time.slice(0, 5)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>
            <Ionicons name="people-outline" size={15} color={C.primary} /> Jugadores
          </Text>
          <View style={styles.playersRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setNumPlayers(Math.max(1, numPlayers - 1))}
            >
              <Ionicons name="remove" size={20} color={C.primary} />
            </TouchableOpacity>
            <View style={styles.counterDisplay}>
              <Text style={styles.counterValue}>{numPlayers}</Text>
              <Text style={styles.counterSub}>jugadores</Text>
            </View>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setNumPlayers(Math.min(court.capacity ?? 20, numPlayers + 1))}
            >
              <Ionicons name="add" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>
            <Ionicons name="card-outline" size={15} color={C.primary} /> Método de pago
          </Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((pm) => {
              const isActive = paymentMethod === pm.id;
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.paymentChip, isActive && styles.paymentChipActive]}
                  onPress={() => setPaymentMethod(pm.id)}
                >
                  <Ionicons
                    name={pm.icon as any}
                    size={16}
                    color={isActive ? "#fff" : C.textMuted}
                  />
                  <Text style={[styles.paymentLabel, isActive && styles.paymentLabelActive]}>
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          {selectedSlot && (
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons name="time-outline" size={14} color={C.textMuted} />
                  <Text style={styles.summaryLabel}>Horario seleccionado</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
                  <Text style={styles.summaryLabel}>Fecha</Text>
                </View>
                <Text style={styles.summaryValue}>{formatDateLabel(selectedDate)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons name="cash-outline" size={15} color={C.primary} />
                  <Text style={styles.summaryTotalLabel}>Total a pagar</Text>
                </View>
                <Text style={styles.summaryTotalValue}>L {court.price_per_hour.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.bookBtn, (!selectedSlot || bookingLoading) && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={!selectedSlot || bookingLoading}
            activeOpacity={0.85}
          >
            {bookingLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={selectedSlot ? "checkmark-circle-outline" : "calendar-outline"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.bookBtnText}>
                  {selectedSlot
                    ? `Reservar · ${selectedSlot.start_time.slice(0, 5)} - ${selectedSlot.end_time.slice(0, 5)}`
                    : "Selecciona un horario"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AmenityBadge({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.amenityBadge}>
      <Ionicons name={icon} size={12} color={C.accent} />
      <Text style={styles.amenityBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.primary },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.background,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(1,182,239,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(1,182,239,0.3)",
  },
  navTitle: { flex: 1, textAlign: "center", fontSize: T.body, fontWeight: "700", color: "#fff" },
  courtImage: { width: "100%", height: 220 },
  mainCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    marginTop: -20,
    padding: 20,
    paddingBottom: 40,
  },
  courtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  courtHeaderLeft: { flex: 1, marginRight: 12 },
  courtName: { fontSize: T.subtitle, fontWeight: "800", color: C.primary, marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: T.small, color: C.textMuted, flex: 1 },
  priceBox: {
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  priceBoxAmount: { color: "#fff", fontSize: 18, fontWeight: "800" },
  priceBoxUnit: { color: "rgba(255,255,255,0.7)", fontSize: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 12 },
  ratingText: { fontSize: T.small, color: C.textMuted, marginLeft: 4 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  amenityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.xxl,
    borderWidth: 1,
    borderColor: `${C.accent}30`,
  },
  amenityBadgeText: { fontSize: 11, color: C.accentDark, fontWeight: "500" },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 18 },
  sectionLabel: { fontSize: T.body, fontWeight: "700", color: C.text, marginBottom: 12 },
  dateScroll: { marginBottom: 4 },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: R.md,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  dateChipActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  dateChipText: { fontSize: T.small, color: C.textMuted, fontWeight: "600" },
  dateChipTextActive: { color: C.accentDark, fontWeight: "700" },
  slotsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  slotsCount: { fontSize: T.small, color: C.accent, fontWeight: "600" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  slotBtn: {
    width: "22%",
    paddingVertical: 12,
    borderRadius: R.sm,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${C.accent}30`,
  },
  slotBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  slotBtnDisabled: { backgroundColor: C.inputBg, borderColor: C.border },
  slotText: { fontSize: 13, fontWeight: "600", color: C.accentDark },
  slotTextActive: { color: "#fff" },
  slotTextDisabled: { color: C.textSoft },
  playersRow: { flexDirection: "row", alignItems: "center", gap: 24, marginBottom: 4 },
  counterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  counterDisplay: { alignItems: "center" },
  counterValue: { fontSize: 28, fontWeight: "800", color: C.primary },
  counterSub: { fontSize: 11, color: C.textMuted },
  paymentRow: { flexDirection: "row", gap: 8 },
  paymentChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  paymentChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  paymentLabel: { fontSize: 11, fontWeight: "600", color: C.textMuted },
  paymentLabelActive: { color: "#fff" },
  closedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: C.inputBg,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
  },
  closedText: { fontSize: T.body, fontWeight: "700", color: C.text, textAlign: "center" },
  closedSubtext: { fontSize: T.small, color: C.textMuted, textAlign: "center" },
  summaryBox: {
    backgroundColor: C.accentSoft,
    borderRadius: R.md,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: `${C.accent}30`,
  },
  summaryLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: T.small, color: C.textMuted },
  summaryValue: { fontSize: T.small, fontWeight: "600", color: C.text },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: `${C.accent}40`,
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  summaryTotalLabel: { fontSize: T.body, fontWeight: "700", color: C.primary },
  summaryTotalValue: { fontSize: T.body, fontWeight: "800", color: C.primary },
  bookBtn: {
    backgroundColor: C.accent,
    paddingVertical: 18,
    borderRadius: R.lg,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  bookBtnDisabled: { opacity: 0.45 },
  bookBtnText: { color: "#fff", fontSize: T.body, fontWeight: "700" },
});
