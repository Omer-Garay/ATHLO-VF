import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Switch,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
// expo-image-picker solo funciona en móvil, no en web
let ImagePicker: any = null;
if (Platform.OS !== "web") {
  ImagePicker = require("expo-image-picker");
}
import { AppTheme } from "@/constants/theme";
import {
  AdminService, AdminStats, AdminCourt, AdminBooking,
  Facility, SportType, CourtSchedule,
} from "@/services/admin.service";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

type ActiveView = "menu" | "overview" | "courts" | "bookings" | "finance";
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, "0")}:00`);

interface DaySchedule {
  day_of_week: number;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
}

const DEFAULT_SCHEDULES = (): DaySchedule[] =>
  DAYS.map((_, i) => ({ day_of_week: i, is_open: i !== 0, opening_time: "06:00", closing_time: "22:00" }));

interface CourtForm {
  field_name: string; facility_id: string; sport_type_id: string;
  price_per_hour: string; surface_type: string; capacity: string;
  description: string; is_premium: boolean;
}
const EMPTY_FORM: CourtForm = {
  field_name: "", facility_id: "", sport_type_id: "",
  price_per_hour: "", surface_type: "", capacity: "", description: "", is_premium: false,
};

export default function AdminScreen() {
  const [activeView, setActiveView] = useState<ActiveView>("menu");
  const [stats, setStats]           = useState<AdminStats | null>(null);
  const [courts, setCourts]         = useState<AdminCourt[]>([]);
  const [bookings, setBookings]     = useState<AdminBooking[]>([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal crear cancha
  const [showAddModal, setShowAddModal]     = useState(false);
  const [facilities, setFacilities]         = useState<Facility[]>([]);
  const [sportTypes, setSportTypes]         = useState<SportType[]>([]);
  const [form, setForm]                     = useState<CourtForm>(EMPTY_FORM);
  const [schedules, setSchedules]           = useState<DaySchedule[]>(DEFAULT_SCHEDULES());
  const [imageUri, setImageUri]             = useState<string | null>(null);
  const [imageBase64, setImageBase64]       = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [formStep, setFormStep]             = useState<1|2|3|4|5>(1);

  // Modal editar cancha
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editCourt, setEditCourt]           = useState<AdminCourt | null>(null);
  const [editForm, setEditForm]             = useState<Partial<CourtForm>>({});
  const [editSchedules, setEditSchedules]   = useState<DaySchedule[]>(DEFAULT_SCHEDULES());
  const [editImageUri, setEditImageUri]     = useState<string | null>(null);
  const [editImageBase64, setEditImageBase64] = useState<string | null>(null);
  const [editSaving, setEditSaving]         = useState(false);
  const [editStep, setEditStep]             = useState<1|2>(1);

  // Time picker
  const [timePickerVisible, setTimePickerVisible]   = useState(false);
  const [timePickerTarget, setTimePickerTarget]     = useState<{ schedType: "new"|"edit"; dayIndex: number; field: "opening_time"|"closing_time" } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, b] = await Promise.allSettled([
        AdminService.getStats(), AdminService.getMyCourts(), AdminService.getAllBookings(),
      ]);
      if (s.status === "fulfilled") setStats(s.value.stats);
      if (c.status === "fulfilled") setCourts(c.value.courts);
      if (b.status === "fulfilled") setBookings(b.value.bookings);
    } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Abrir modal de crear ──────────────────────────────────────────────────
  const openAddModal = async () => {
    setForm(EMPTY_FORM); setSchedules(DEFAULT_SCHEDULES());
    setImageUri(null); setImageBase64(null); setFormStep(1); setShowAddModal(true);
    try {
      const [facRes, stRes] = await Promise.all([AdminService.getFacilities(), AdminService.getSportTypes()]);
      setFacilities(facRes.facilities); setSportTypes(stRes.sport_types);
    } catch (err: any) {
      Alert.alert("Error al cargar datos", err.message);
      setShowAddModal(false);
    }
  };

  // ── Abrir modal de editar ─────────────────────────────────────────────────
  const openEditModal = async (court: AdminCourt) => {
    setEditCourt(court);
    setEditForm({
      field_name: court.field_name,
      price_per_hour: String(court.price_per_hour),
      surface_type: court.surface_type ?? "",
      capacity: court.capacity ? String(court.capacity) : "",
      description: court.description ?? "",
      is_premium: court.is_premium,
    });
    setEditImageUri(court.image_url);
    setEditImageBase64(null);
    setEditStep(1);
    setShowEditModal(true);

    // Cargar horarios existentes
    try {
      const { schedules: existing } = await AdminService.getCourtSchedules(court.field_id);
      if (existing.length > 0) {
        const mapped: DaySchedule[] = DAYS.map((_, i) => {
          const found = existing.find((s) => s.day_of_week === i);
          return {
            day_of_week: i,
            is_open: !!found && !found.is_closed,
            opening_time: found?.opening_time ?? "06:00",
            closing_time: found?.closing_time ?? "22:00",
          };
        });
        setEditSchedules(mapped);
      } else {
        setEditSchedules(DEFAULT_SCHEDULES());
      }
    } catch {
      setEditSchedules(DEFAULT_SCHEDULES());
    }
  };

  // ── Guardar cambios de edición ────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editCourt) return;
    setEditSaving(true);
    try {
      // 1. Actualizar datos básicos
      await AdminService.updateCourt(editCourt.field_id, {
        field_name: editForm.field_name,
        price_per_hour: editForm.price_per_hour ? Number(editForm.price_per_hour) : undefined,
        surface_type: editForm.surface_type || undefined,
        capacity: editForm.capacity ? Number(editForm.capacity) : undefined,
        description: editForm.description || undefined,
        is_premium: editForm.is_premium,
      } as any);

      // 2. Actualizar horarios
      const openSchedules: CourtSchedule[] = editSchedules.map((s) => ({
        day_of_week: s.day_of_week,
        opening_time: s.opening_time,
        closing_time: s.closing_time,
        is_closed: !s.is_open,
      }));
      await AdminService.updateCourtSchedules(editCourt.field_id, openSchedules);

      // 3. Subir imagen si cambió
      if (editImageBase64) {
        try {
          await AdminService.uploadCourtImage(editCourt.field_id, editImageBase64);
        } catch (imgErr: any) {
          Alert.alert("Cancha actualizada", `Datos guardados, pero no se pudo subir la imagen:\n${imgErr.message}`);
          setShowEditModal(false); loadData(); return;
        }
      }

      Alert.alert("¡Listo!", "Cancha actualizada exitosamente");
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // ── Eliminar cancha ───────────────────────────────────────────────────────
  const handleDeleteCourt = (court: AdminCourt) => {
    Alert.alert(
      "Eliminar Cancha",
      `¿Seguro que deseas eliminar "${court.field_name}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await AdminService.deleteCourt(court.field_id);
              setCourts((prev) => prev.filter((c) => c.field_id !== court.field_id));
              Alert.alert("Eliminada", "Cancha eliminada exitosamente");
            } catch (err: any) {
              Alert.alert("No se pudo eliminar", err.message);
            }
          },
        },
      ]
    );
  };

  // ── Image pickers ─────────────────────────────────────────────────────────
  const pickImage = async (target: "new" | "edit") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      if (target === "new") { setImageUri(result.assets[0].uri); setImageBase64(result.assets[0].base64 ?? null); }
      else { setEditImageUri(result.assets[0].uri); setEditImageBase64(result.assets[0].base64 ?? null); }
    }
  };

  const takePhoto = async (target: "new" | "edit") => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permiso necesario", "Necesitamos acceso a tu cámara."); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [16, 9], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      if (target === "new") { setImageUri(result.assets[0].uri); setImageBase64(result.assets[0].base64 ?? null); }
      else { setEditImageUri(result.assets[0].uri); setEditImageBase64(result.assets[0].base64 ?? null); }
    }
  };

  // ── Guardar nueva cancha ──────────────────────────────────────────────────
  const handleSaveCourt = async () => {
    const { field_name, facility_id, sport_type_id, price_per_hour } = form;
    if (!field_name.trim() || !facility_id || !sport_type_id || !price_per_hour) {
      Alert.alert("Error", "Completa todos los campos obligatorios (*)"); return;
    }
    if (isNaN(Number(price_per_hour)) || Number(price_per_hour) <= 0) {
      Alert.alert("Error", "El precio por hora debe ser un número positivo"); return;
    }
    setSaving(true);
    try {
      const openSchedules = schedules
        .filter((s) => s.is_open)
        .map(({ day_of_week, opening_time, closing_time }) => ({ day_of_week, opening_time, closing_time }));

      const result = await AdminService.createCourt({
        field_name: form.field_name.trim(),
        facility_id: Number(form.facility_id),
        sport_type_id: Number(form.sport_type_id),
        price_per_hour: Number(form.price_per_hour),
        surface_type: form.surface_type.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        description: form.description.trim() || undefined,
        is_premium: form.is_premium,
        schedules: openSchedules,
      });

      if (imageBase64 && result.field_id) {
        try {
          await AdminService.uploadCourtImage(result.field_id, imageBase64);
        } catch (imgErr: any) {
          Alert.alert("Cancha creada", `${result.message}\n\nNota: No se pudo subir la imagen.\nRazón: ${imgErr.message}\n\nVerifica que el bucket "courts" exista en Supabase Storage.`);
          setShowAddModal(false); loadData(); return;
        }
      }

      Alert.alert("¡Cancha creada!", result.message);
      setShowAddModal(false); loadData();
    } catch (err: any) {
      Alert.alert("Error al crear cancha", err.message);
    } finally { setSaving(false); }
  };

  const toggleAvailability = async (court: AdminCourt) => {
    try {
      await AdminService.toggleCourtAvailability(court.field_id, !court.is_available);
      setCourts((prev) => prev.map((c) => c.field_id === court.field_id ? { ...c, is_available: !c.is_available } : c));
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  // ── Time picker helpers ───────────────────────────────────────────────────
  const updateScheduleField = (schedType: "new"|"edit", dayIndex: number, field: keyof DaySchedule, value: any) => {
    const updater = (prev: DaySchedule[]) => prev.map((s) => s.day_of_week === dayIndex ? { ...s, [field]: value } : s);
    if (schedType === "new") setSchedules(updater); else setEditSchedules(updater);
  };

  const openTimePicker = (schedType: "new"|"edit", dayIndex: number, field: "opening_time"|"closing_time") => {
    setTimePickerTarget({ schedType, dayIndex, field }); setTimePickerVisible(true);
  };

  const selectTime = (time: string) => {
    if (!timePickerTarget) return;
    updateScheduleField(timePickerTarget.schedType, timePickerTarget.dayIndex, timePickerTarget.field, time);
    setTimePickerVisible(false); setTimePickerTarget(null);
  };

  // ── Renders de vistas ─────────────────────────────────────────────────────
  const menuItems = [
    { view: "overview" as ActiveView, icon: "grid-outline",     label: "Resumen General", color: C.accent },
    { view: "courts"   as ActiveView, icon: "football-outline", label: "Mis Canchas",     color: C.primary },
    { view: "bookings" as ActiveView, icon: "calendar-outline", label: "Reservas",         color: "#7C3AED" },
    { view: "finance"  as ActiveView, icon: "cash-outline",     label: "Finanzas",         color: C.success },
  ];

  const renderMenu = () => (
    <View style={styles.menuGrid}>
      {menuItems.map((item) => (
        <TouchableOpacity key={item.view} style={styles.menuCard} onPress={() => setActiveView(item.view)} activeOpacity={0.8}>
          <View style={[styles.menuIconBg, { backgroundColor: item.color + "18" }]}>
            <Ionicons name={item.icon as any} size={26} color={item.color} />
          </View>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={16} color={C.textSoft} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <View style={styles.statsGrid}>
        <StatCard label="Canchas"      value={String(stats?.total_courts ?? 0)}              icon="football" color={C.primary} />
        <StatCard label="Reservas"     value={String(stats?.total_bookings ?? 0)}             icon="calendar" color={C.accent} />
        <StatCard label="Ingresos"     value={`L ${(stats?.total_revenue ?? 0).toFixed(0)}`} icon="cash"     color={C.success} />
        <StatCard label="Calificación" value={(stats?.avg_rating ?? 0).toFixed(1) + "★"}     icon="star"     color={C.starColor} />
      </View>
      <Text style={styles.subSection}>Reservas recientes</Text>
      {bookings.filter((b) => b.booking_status === "confirmed" || b.booking_status === "pending").slice(0, 5).map((b) => (
        <View key={b.booking_id} style={styles.bookingRow}>
          <View style={styles.bookingLeft}>
            <Text style={styles.bookingCourt} numberOfLines={1}>{b.field_name}</Text>
            <Text style={styles.bookingClient}>{b.client_name} · {b.booking_date} {b.start_time.slice(0, 5)}</Text>
          </View>
          <Text style={styles.bookingPrice}>L {b.final_price.toFixed(0)}</Text>
        </View>
      ))}
      {bookings.length === 0 && <Text style={styles.emptyNote}>Sin reservas activas</Text>}
    </ScrollView>
  );

  const renderCourts = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Agregar Cancha</Text>
      </TouchableOpacity>
      {courts.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Ionicons name="football-outline" size={48} color={C.border} />
          <Text style={styles.emptyNote}>Sin canchas registradas</Text>
          <Text style={styles.emptyHint}>Toca "Agregar Cancha" para crear la primera</Text>
        </View>
      )}
      {courts.map((court) => (
        <View key={court.field_id} style={styles.courtCard}>
          {court.image_url && (
            <Image source={{ uri: court.image_url }} style={styles.courtCardImage} />
          )}
          <View style={styles.courtCardBody}>
            <View style={styles.courtCardHeader}>
              <View style={styles.courtCardLeft}>
                <Text style={styles.courtCardName} numberOfLines={1}>{court.field_name}</Text>
                <Text style={styles.courtCardSub}>{court.sport_name} · {court.city}</Text>
              </View>
              <Switch
                value={court.is_available}
                onValueChange={() => toggleAvailability(court)}
                trackColor={{ false: C.border, true: C.success + "60" }}
                thumbColor={court.is_available ? C.success : C.textSoft}
              />
            </View>

            <View style={styles.courtCardFooter}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={C.starColor} />
                <Text style={styles.courtRating}>{court.rating.toFixed(1)} ({court.review_count})</Text>
              </View>
              <Text style={styles.courtPrice}>L {court.price_per_hour.toFixed(0)}/hr</Text>
              <View style={[styles.availBadge, { backgroundColor: court.is_available ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.availText, { color: court.is_available ? C.success : C.danger }]}>
                  {court.is_available ? "Disponible" : "No disponible"}
                </Text>
              </View>
            </View>

            {/* Acciones: editar y eliminar */}
            <View style={styles.courtActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(court)}>
                <Ionicons name="pencil-outline" size={14} color={C.accent} />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCourt(court)}>
                <Ionicons name="trash-outline" size={14} color={C.danger} />
                <Text style={styles.deleteBtnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderBookings = () => {
    const statusColors: Record<string, string> = { confirmed: C.success, pending: C.warning, cancelled: C.danger, completed: C.accent, no_show: C.textMuted };
    const statusLabels: Record<string, string> = { confirmed: "Confirmada", pending: "Pendiente", cancelled: "Cancelada", completed: "Completada", no_show: "No asistió" };
    return (
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        {bookings.length === 0 && <Text style={[styles.emptyNote, { marginTop: 40 }]}>Sin reservas registradas</Text>}
        {bookings.map((b) => {
          const color = statusColors[b.booking_status] ?? C.textMuted;
          return (
            <View key={b.booking_id} style={styles.bookingCard}>
              <View style={styles.bookingCardHeader}>
                <Text style={styles.bookingCardCourt} numberOfLines={1}>{b.field_name}</Text>
                <View style={[styles.statusPill, { backgroundColor: color + "20" }]}>
                  <Text style={[styles.statusPillText, { color }]}>{statusLabels[b.booking_status] ?? b.booking_status}</Text>
                </View>
              </View>
              <Text style={styles.bookingCardClient}>{b.client_name}</Text>
              <Text style={styles.bookingCardTime}>{b.booking_date} · {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</Text>
              <View style={styles.bookingCardFooter}>
                <Text style={styles.bookingCardPayment}>Pago: {b.payment_status}</Text>
                <Text style={styles.bookingCardPrice}>L {b.final_price.toFixed(2)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderFinance = () => {
    const completed = bookings.filter((b) => b.booking_status === "completed");
    const confirmed = bookings.filter((b) => b.booking_status === "confirmed");
    const totalRevenue = completed.reduce((s, b) => s + b.final_price, 0);
    const pending = confirmed.reduce((s, b) => s + b.final_price, 0);
    return (
      <ScrollView>
        {[
          { label: "Ingresos totales (completados)", value: `L ${totalRevenue.toFixed(2)}`,              color: C.text },
          { label: "Por cobrar (confirmadas)",       value: `L ${pending.toFixed(2)}`,                  color: C.warning },
          { label: "Comisión estimada (5%)",         value: `- L ${(totalRevenue * 0.05).toFixed(2)}`,  color: C.danger },
          { label: "Pago neto estimado",             value: `L ${(totalRevenue * 0.95).toFixed(2)}`,    color: C.accent },
        ].map((item) => (
          <View key={item.label} style={styles.financeCard}>
            <Text style={styles.financeLabel}>{item.label}</Text>
            <Text style={[styles.financeValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ── Renderizador de horarios (compartido entre crear y editar) ────────────
  const renderSchedules = (
    schedArray: DaySchedule[],
    schedType: "new" | "edit"
  ) => (
    <View>
      <Text style={styles.stepHint}>
        Configura los días y rangos de horas disponibles para reservas.
        Los clientes solo verán horarios dentro de estos rangos.
      </Text>
      {schedArray.map((sch) => (
        <View key={sch.day_of_week} style={styles.dayRow}>
          <View style={styles.dayRowLeft}>
            <Switch
              value={sch.is_open}
              onValueChange={(v) => updateScheduleField(schedType, sch.day_of_week, "is_open", v)}
              trackColor={{ false: C.border, true: C.accent + "60" }}
              thumbColor={sch.is_open ? C.accent : C.textSoft}
            />
            <Text style={[styles.dayName, !sch.is_open && styles.dayNameClosed]}>
              {DAYS[sch.day_of_week]}
            </Text>
          </View>
          {sch.is_open ? (
            <View style={styles.timeRange}>
              <TouchableOpacity style={styles.timeBtn} onPress={() => openTimePicker(schedType, sch.day_of_week, "opening_time")}>
                <Ionicons name="time-outline" size={13} color={C.accent} />
                <Text style={styles.timeBtnText}>{sch.opening_time}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>→</Text>
              <TouchableOpacity style={[styles.timeBtn, { borderColor: C.primary + "40" }]} onPress={() => openTimePicker(schedType, sch.day_of_week, "closing_time")}>
                <Ionicons name="time-outline" size={13} color={C.primary} />
                <Text style={[styles.timeBtnText, { color: C.primary }]}>{sch.closing_time}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.closedBadge}><Text style={styles.closedBadgeText}>Cerrado</Text></View>
          )}
        </View>
      ))}
    </View>
  );

  // ── Renderizador de picker de imagen ─────────────────────────────────────
  const renderImagePicker = (target: "new" | "edit", uri: string | null) => (
    <View>
      <Text style={styles.stepHint}>Agrega una foto de la cancha (opcional). Recomendado: 16:9.</Text>
      {uri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.imageRemoveBtn}
            onPress={() => {
              if (target === "new") { setImageUri(null); setImageBase64(null); }
              else { setEditImageUri(null); setEditImageBase64(null); }
            }}
          >
            <Ionicons name="close-circle" size={28} color={C.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imagePickerArea}>
          <Ionicons name="image-outline" size={48} color={C.textSoft} />
          <Text style={styles.imagePickerTitle}>Sin imagen seleccionada</Text>
          <Text style={styles.imagePickerSub}>Formato 16:9 · Máx. 5 MB</Text>
        </View>
      )}
      <View style={styles.imageActions}>
        <TouchableOpacity style={styles.imageActionBtn} onPress={() => pickImage(target)}>
          <Ionicons name="images-outline" size={20} color={C.accent} />
          <Text style={styles.imageActionText}>Galería</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageActionBtn} onPress={() => takePhoto(target)}>
          <Ionicons name="camera-outline" size={20} color={C.primary} />
          <Text style={[styles.imageActionText, { color: C.primary }]}>Cámara</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── STEPS crear cancha ─────────────────────────────────────────────────────
  const STEPS = ["Información", "Instalación", "Tipo y Precio", "Horarios", "Imagen"];
  const f = form;
  const setF = (key: keyof CourtForm, val: any) => setForm((prev) => ({ ...prev, [key]: val }));
  const selectedFacility = facilities.find((x) => String(x.facility_id) === f.facility_id);
  const selectedSport    = sportTypes.find((x) => String(x.sport_type_id) === f.sport_type_id);

  const canAdvanceStep = () => {
    if (formStep === 1) return f.field_name.trim().length > 0;
    if (formStep === 2) return f.facility_id !== "";
    if (formStep === 3) return f.sport_type_id !== "" && f.price_per_hour !== "" && Number(f.price_per_hour) > 0;
    return true;
  };

  const renderAddModal = () => (
    <Modal visible={showAddModal} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrapper}>
        <View style={styles.modalSheet}>
          <View style={styles.modalPill} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { if (formStep === 1) setShowAddModal(false); else setFormStep((prev) => (prev - 1) as any); }}>
              <Ionicons name={formStep === 1 ? "close" : "arrow-back"} size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{formStep}/{STEPS.length} · {STEPS[formStep - 1]}</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.progressBar}>
            {STEPS.map((_, i) => <View key={i} style={[styles.progressSegment, i < formStep && styles.progressSegmentActive]} />)}
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formStep === 1 && (
              <View>
                <FormLabel>Nombre de la cancha *</FormLabel>
                <FormInput placeholder="Ej: Cancha 1 - Fútbol 5" value={f.field_name} onChangeText={(v) => setF("field_name", v)} autoFocus />
                <FormLabel>Descripción</FormLabel>
                <FormInput placeholder="Características adicionales..." value={f.description} onChangeText={(v) => setF("description", v)} multiline numberOfLines={3} />
                <View style={styles.premiumRow}>
                  <View>
                    <Text style={styles.premiumLabel}>¿Cancha Premium?</Text>
                    <Text style={styles.premiumSub}>Aparece en la sección destacada</Text>
                  </View>
                  <Switch value={f.is_premium} onValueChange={(v) => setF("is_premium", v)} trackColor={{ false: C.border, true: C.accent + "60" }} thumbColor={f.is_premium ? C.accent : C.textSoft} />
                </View>
              </View>
            )}
            {formStep === 2 && (
              <View>
                <FormLabel>Selecciona una instalación *</FormLabel>
                {facilities.length === 0 ? (
                  <View style={styles.noFacilitiesBox}>
                    <Ionicons name="business-outline" size={32} color={C.textSoft} />
                    <Text style={styles.noFacilitiesText}>No tienes instalaciones registradas.</Text>
                    <Text style={styles.noFacilitiesSub}>Contacta al administrador para crear una primero.</Text>
                  </View>
                ) : facilities.map((fac) => {
                  const selected = f.facility_id === String(fac.facility_id);
                  return (
                    <TouchableOpacity key={fac.facility_id} style={[styles.selectOption, selected && styles.selectOptionActive]} onPress={() => setF("facility_id", String(fac.facility_id))}>
                      <Ionicons name="business-outline" size={18} color={selected ? C.accent : C.textMuted} />
                      <View style={styles.selectOptionText}>
                        <Text style={[styles.selectOptionLabel, selected && styles.selectOptionLabelActive]}>{fac.facility_name}</Text>
                        <Text style={styles.selectOptionSub}>{fac.city} · {fac.address}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {formStep === 3 && (
              <View>
                <FormLabel>Tipo de deporte *</FormLabel>
                <View style={styles.sportGrid}>
                  {sportTypes.map((st) => {
                    const selected = f.sport_type_id === String(st.sport_type_id);
                    return (
                      <TouchableOpacity key={st.sport_type_id} style={[styles.sportChip, selected && styles.sportChipActive]} onPress={() => setF("sport_type_id", String(st.sport_type_id))}>
                        <Text style={[styles.sportChipText, selected && styles.sportChipTextActive]}>{st.sport_name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <FormLabel>Precio por hora (L) *</FormLabel>
                <FormInput placeholder="Ej: 500" value={f.price_per_hour} onChangeText={(v) => setF("price_per_hour", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" />
                <FormLabel>Tipo de superficie</FormLabel>
                <View style={styles.sportGrid}>
                  {["Natural", "Sintética", "Cemento", "Madera", "Cristal", "Dura"].map((s) => {
                    const sel = f.surface_type === s;
                    return <TouchableOpacity key={s} style={[styles.sportChip, sel && styles.sportChipActive]} onPress={() => setF("surface_type", sel ? "" : s)}><Text style={[styles.sportChipText, sel && styles.sportChipTextActive]}>{s}</Text></TouchableOpacity>;
                  })}
                </View>
                <FormLabel>Capacidad máxima (jugadores)</FormLabel>
                <FormInput placeholder="Ej: 10" value={f.capacity} onChangeText={(v) => setF("capacity", v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" />
              </View>
            )}
            {formStep === 4 && renderSchedules(schedules, "new")}
            {formStep === 5 && (
              <View>
                {renderImagePicker("new", imageUri)}
                <View style={[styles.summaryBox, { marginTop: 16 }]}>
                  <Text style={styles.summaryTitle}>Resumen</Text>
                  <SummaryRow label="Nombre"     value={f.field_name} />
                  <SummaryRow label="Instalación" value={selectedFacility?.facility_name ?? "—"} />
                  <SummaryRow label="Deporte"    value={selectedSport?.sport_name ?? "—"} />
                  <SummaryRow label="Precio"     value={f.price_per_hour ? `L ${f.price_per_hour}/hr` : "—"} />
                  <SummaryRow label="Días abiertos" value={`${schedules.filter((s) => s.is_open).length} días`} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.nextBtn, (!canAdvanceStep() || saving) && styles.nextBtnDisabled]}
              onPress={() => { if (formStep < 5) setFormStep((prev) => (prev + 1) as any); else handleSaveCourt(); }}
              disabled={!canAdvanceStep() || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.nextBtnText}>{formStep < 5 ? "Siguiente" : "Crear Cancha"}</Text>
                  <Ionicons name={formStep < 5 ? "arrow-forward" : "checkmark-circle-outline"} size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Time Picker */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.timePickerOverlay} activeOpacity={1} onPress={() => setTimePickerVisible(false)}>
          <View style={styles.timePickerSheet}>
            <Text style={styles.timePickerTitle}>
              {timePickerTarget?.field === "opening_time" ? "Hora de apertura" : "Hora de cierre"}
            </Text>
            <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
              {HOURS.map((h) => {
                const current = timePickerTarget
                  ? (timePickerTarget.schedType === "new" ? schedules : editSchedules)[timePickerTarget.dayIndex]?.[timePickerTarget.field]
                  : null;
                const isSelected = h === current;
                return (
                  <TouchableOpacity key={h} style={[styles.timeOption, isSelected && styles.timeOptionActive]} onPress={() => selectTime(h)}>
                    <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextActive]}>{h}</Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );

  // ── Modal editar cancha ────────────────────────────────────────────────────
  const renderEditModal = () => (
    <Modal visible={showEditModal} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrapper}>
        <View style={styles.modalSheet}>
          <View style={styles.modalPill} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { if (editStep === 1) setShowEditModal(false); else setEditStep(1); }}>
              <Ionicons name={editStep === 1 ? "close" : "arrow-back"} size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editStep}/2 · {editStep === 1 ? "Editar Cancha" : "Horarios e Imagen"}
            </Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.progressBar}>
            {[1, 2].map((i) => <View key={i} style={[styles.progressSegment, i <= editStep && styles.progressSegmentActive]} />)}
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {editStep === 1 && (
              <View>
                <FormLabel>Nombre de la cancha</FormLabel>
                <FormInput value={editForm.field_name ?? ""} onChangeText={(v) => setEditForm((p) => ({ ...p, field_name: v }))} placeholder="Nombre" />
                <FormLabel>Precio por hora (L)</FormLabel>
                <FormInput value={editForm.price_per_hour ?? ""} onChangeText={(v) => setEditForm((p) => ({ ...p, price_per_hour: v.replace(/[^0-9.]/g, "") }))} keyboardType="decimal-pad" placeholder="Ej: 500" />
                <FormLabel>Tipo de superficie</FormLabel>
                <View style={styles.sportGrid}>
                  {["Natural", "Sintética", "Cemento", "Madera", "Cristal", "Dura"].map((s) => {
                    const sel = editForm.surface_type === s;
                    return <TouchableOpacity key={s} style={[styles.sportChip, sel && styles.sportChipActive]} onPress={() => setEditForm((p) => ({ ...p, surface_type: sel ? "" : s }))}><Text style={[styles.sportChipText, sel && styles.sportChipTextActive]}>{s}</Text></TouchableOpacity>;
                  })}
                </View>
                <FormLabel>Capacidad máxima</FormLabel>
                <FormInput value={editForm.capacity ?? ""} onChangeText={(v) => setEditForm((p) => ({ ...p, capacity: v.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" placeholder="Ej: 10" />
                <FormLabel>Descripción</FormLabel>
                <FormInput value={editForm.description ?? ""} onChangeText={(v) => setEditForm((p) => ({ ...p, description: v }))} multiline numberOfLines={3} placeholder="Descripción..." />
                <View style={[styles.premiumRow, { marginBottom: 16 }]}>
                  <View>
                    <Text style={styles.premiumLabel}>¿Cancha Premium?</Text>
                    <Text style={styles.premiumSub}>Aparece en la sección destacada</Text>
                  </View>
                  <Switch value={editForm.is_premium ?? false} onValueChange={(v) => setEditForm((p) => ({ ...p, is_premium: v }))} trackColor={{ false: C.border, true: C.accent + "60" }} thumbColor={editForm.is_premium ? C.accent : C.textSoft} />
                </View>
              </View>
            )}
            {editStep === 2 && (
              <View>
                {renderSchedules(editSchedules, "edit")}
                <View style={{ height: 16 }} />
                {renderImagePicker("edit", editImageUri)}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.nextBtn, editSaving && styles.nextBtnDisabled]}
              onPress={() => { if (editStep < 2) setEditStep(2); else handleSaveEdit(); }}
              disabled={editSaving}
            >
              {editSaving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.nextBtnText}>{editStep < 2 ? "Siguiente" : "Guardar Cambios"}</Text>
                  <Ionicons name={editStep < 2 ? "arrow-forward" : "checkmark-circle-outline"} size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Time Picker compartido */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.timePickerOverlay} activeOpacity={1} onPress={() => setTimePickerVisible(false)}>
          <View style={styles.timePickerSheet}>
            <Text style={styles.timePickerTitle}>
              {timePickerTarget?.field === "opening_time" ? "Hora de apertura" : "Hora de cierre"}
            </Text>
            <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
              {HOURS.map((h) => {
                const current = timePickerTarget
                  ? (timePickerTarget.schedType === "new" ? schedules : editSchedules)[timePickerTarget.dayIndex]?.[timePickerTarget.field]
                  : null;
                const isSelected = h === current;
                return (
                  <TouchableOpacity key={h} style={[styles.timeOption, isSelected && styles.timeOptionActive]} onPress={() => selectTime(h)}>
                    <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextActive]}>{h}</Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );

  const viewTitles: Record<ActiveView, string> = {
    menu: "Administración", overview: "Resumen", courts: "Mis Canchas", bookings: "Reservas", finance: "Finanzas",
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => activeView === "menu" ? router.back() : setActiveView("menu")}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{viewTitles[activeView]}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.content}>
        {loading && activeView === "menu" ? (
          <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeView === "menu"     && renderMenu()}
            {activeView === "overview" && renderOverview()}
            {activeView === "courts"   && renderCourts()}
            {activeView === "bookings" && renderBookings()}
            {activeView === "finance"  && renderFinance()}
          </>
        )}
      </View>
      {renderAddModal()}
      {renderEditModal()}
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function FormLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.formLabel}>{children}</Text>;
}
function FormInput(props: { placeholder?: string; value: string; onChangeText: (v: string) => void; keyboardType?: any; multiline?: boolean; numberOfLines?: number; autoFocus?: boolean }) {
  return (
    <TextInput style={[styles.formInput, props.multiline && styles.formInputMulti]}
      placeholder={props.placeholder} placeholderTextColor={AppTheme.colors.textSoft}
      value={props.value} onChangeText={props.onChangeText}
      keyboardType={props.keyboardType} multiline={props.multiline}
      numberOfLines={props.numberOfLines} autoFocus={props.autoFocus} />
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center", borderRadius: 18, backgroundColor: C.accentLight },
  headerTitle: { flex: 1, textAlign: "center", fontSize: T.heading, fontWeight: "800", color: C.primary },
  content: { flex: 1, padding: 16 },
  menuGrid: { gap: 12 },
  menuCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.white, borderRadius: R.lg, padding: 16, ...AppTheme.shadow.card, borderWidth: 1, borderColor: C.border },
  menuIconBg: { width: 48, height: 48, borderRadius: R.md, justifyContent: "center", alignItems: "center" },
  menuLabel: { flex: 1, fontSize: T.body, fontWeight: "600", color: C.text },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: C.white, borderRadius: R.lg, padding: 16, borderTopWidth: 3, alignItems: "center", gap: 6, ...AppTheme.shadow.card },
  statValue: { fontSize: T.heading, fontWeight: "700", color: C.text },
  statLabel: { fontSize: T.small, color: C.textMuted },
  subSection: { fontSize: T.body, fontWeight: "700", color: C.text, marginBottom: 10 },
  bookingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  bookingLeft: { flex: 1, marginRight: 10 },
  bookingCourt: { fontSize: T.small, fontWeight: "700", color: C.text },
  bookingClient: { fontSize: 11, color: C.textMuted },
  bookingPrice: { fontSize: T.small, fontWeight: "700", color: C.primary },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 14, marginBottom: 16 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: T.body },
  courtCard: { backgroundColor: C.white, borderRadius: R.lg, marginBottom: 12, ...AppTheme.shadow.card, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  courtCardImage: { width: "100%", height: 140 },
  courtCardBody: { padding: 14 },
  courtCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  courtCardLeft: { flex: 1, marginRight: 10 },
  courtCardName: { fontSize: T.body, fontWeight: "700", color: C.text },
  courtCardSub: { fontSize: 12, color: C.textMuted },
  courtCardFooter: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  courtRating: { fontSize: 12, color: C.textMuted },
  courtPrice: { flex: 1, fontSize: 12, color: C.primary, fontWeight: "600" },
  availBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.xxl },
  availText: { fontSize: 11, fontWeight: "700" },
  courtActions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: R.sm, borderWidth: 1, borderColor: C.accent, backgroundColor: C.accentLight },
  editBtnText: { fontSize: 12, fontWeight: "700", color: C.accent },
  deleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: R.sm, borderWidth: 1, borderColor: C.danger, backgroundColor: C.dangerSoft },
  deleteBtnText: { fontSize: 12, fontWeight: "700", color: C.danger },
  emptyContainer: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyNote: { textAlign: "center", color: C.textMuted, fontSize: T.small },
  emptyHint: { textAlign: "center", color: C.textSoft, fontSize: 12 },
  bookingCard: { backgroundColor: C.white, borderRadius: R.lg, padding: 14, marginBottom: 10, ...AppTheme.shadow.card, borderWidth: 1, borderColor: C.border },
  bookingCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  bookingCardCourt: { flex: 1, fontSize: T.body, fontWeight: "700", color: C.text, marginRight: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.xxl },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  bookingCardClient: { fontSize: T.small, color: C.textMuted, marginTop: 2 },
  bookingCardTime: { fontSize: T.small, color: C.textMuted },
  bookingCardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  bookingCardPayment: { fontSize: 12, color: C.textMuted },
  bookingCardPrice: { fontSize: T.small, fontWeight: "700", color: C.primary },
  financeCard: { backgroundColor: C.white, borderRadius: R.lg, padding: 16, marginBottom: 12, ...AppTheme.shadow.card, borderWidth: 1, borderColor: C.border },
  financeLabel: { fontSize: T.small, color: C.textMuted, marginBottom: 6 },
  financeValue: { fontSize: 26, fontWeight: "700", color: C.text },
  modalWrapper: { flex: 1, justifyContent: "flex-end", backgroundColor: C.overlay },
  modalSheet: { backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, maxHeight: "94%" },
  modalPill: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: T.body, fontWeight: "700", color: C.primary },
  progressBar: { flexDirection: "row", gap: 4, paddingHorizontal: 20, paddingVertical: 10 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border },
  progressSegmentActive: { backgroundColor: C.accent },
  modalBody: { paddingHorizontal: 20, paddingTop: 8 },
  formLabel: { fontSize: T.small, fontWeight: "700", color: C.text, marginBottom: 8, marginTop: 16 },
  formInput: { backgroundColor: C.inputBg, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: T.body, color: C.text },
  formInputMulti: { minHeight: 80, textAlignVertical: "top" },
  premiumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: 14, backgroundColor: C.accentLight, borderRadius: R.md, borderWidth: 1, borderColor: C.accent + "30" },
  premiumLabel: { fontSize: T.body, fontWeight: "600", color: C.text },
  premiumSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  selectOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: R.md, marginBottom: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  selectOptionActive: { borderColor: C.accent, backgroundColor: C.accentLight },
  selectOptionText: { flex: 1 },
  selectOptionLabel: { fontSize: T.body, fontWeight: "600", color: C.text },
  selectOptionLabelActive: { color: C.accentDark },
  selectOptionSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  noFacilitiesBox: { alignItems: "center", padding: 30, gap: 8, backgroundColor: C.inputBg, borderRadius: R.lg },
  noFacilitiesText: { fontSize: T.body, fontWeight: "600", color: C.textMuted, textAlign: "center" },
  noFacilitiesSub: { fontSize: 12, color: C.textSoft, textAlign: "center" },
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  sportChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.xxl, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  sportChipActive: { borderColor: C.accent, backgroundColor: C.accentLight },
  sportChipText: { fontSize: 13, fontWeight: "600", color: C.textMuted },
  sportChipTextActive: { color: C.accentDark },
  stepHint: { fontSize: T.small, color: C.textMuted, lineHeight: 20, marginTop: 4, marginBottom: 4, backgroundColor: C.inputBg, padding: 12, borderRadius: R.sm },
  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  dayRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, width: 80 },
  dayName: { fontSize: T.small, fontWeight: "700", color: C.text },
  dayNameClosed: { color: C.textSoft },
  timeRange: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.accentLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: R.sm, borderWidth: 1, borderColor: C.accent + "40" },
  timeBtnText: { fontSize: 13, fontWeight: "700", color: C.accent },
  timeSeparator: { fontSize: 13, color: C.textSoft, fontWeight: "600" },
  closedBadge: { backgroundColor: C.inputBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.sm },
  closedBadgeText: { fontSize: 12, color: C.textSoft },
  timePickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  timePickerSheet: { backgroundColor: C.white, borderRadius: R.xl, width: 200, maxHeight: 360, overflow: "hidden" },
  timePickerTitle: { fontSize: T.small, fontWeight: "700", color: C.primary, textAlign: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  timePickerScroll: { maxHeight: 300 },
  timeOption: { paddingVertical: 13, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border },
  timeOptionActive: { backgroundColor: C.accent },
  timeOptionText: { fontSize: T.body, fontWeight: "600", color: C.text },
  timeOptionTextActive: { color: "#fff" },
  imagePreviewContainer: { position: "relative", borderRadius: R.lg, overflow: "hidden", marginTop: 8 },
  imagePreview: { width: "100%", height: 200 },
  imageRemoveBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14 },
  imagePickerArea: { alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: C.inputBg, borderRadius: R.lg, borderWidth: 2, borderColor: C.border, borderStyle: "dashed", marginTop: 8, gap: 8 },
  imagePickerTitle: { fontSize: T.body, fontWeight: "600", color: C.textMuted },
  imagePickerSub: { fontSize: 12, color: C.textSoft },
  imageActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  imageActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  imageActionText: { fontSize: T.small, fontWeight: "700", color: C.accent },
  summaryBox: { backgroundColor: C.accentLight, borderRadius: R.md, padding: 14, borderWidth: 1, borderColor: C.accent + "30" },
  summaryTitle: { fontSize: T.small, fontWeight: "700", color: C.primary, marginBottom: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.accent + "20" },
  summaryLabel: { fontSize: T.small, color: C.textMuted },
  summaryValue: { fontSize: T.small, fontWeight: "600", color: C.text, maxWidth: "60%" },
  modalFooter: { padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 16, borderTopWidth: 1, borderTopColor: C.border },
  nextBtn: { backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: T.body },
});
