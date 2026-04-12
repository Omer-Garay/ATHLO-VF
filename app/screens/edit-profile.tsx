/**
 * app/screens/edit-profile.tsx
 * Pantalla de edición de perfil — disponible para todos los roles.
 * Permite: foto de perfil, nombre, apellido, teléfono, username.
 */
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AppTheme } from "@/constants/theme";
import { ProfileService, UserProfile } from "@/services/profile.service";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

export default function EditProfileScreen() {
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [phone, setPhone]           = useState("");
  const [username, setUsername]     = useState("");
  const [avatarUri, setAvatarUri]     = useState<string | null>(null);
  const [avatarB64, setAvatarB64]     = useState<string | null>(null);
  const [avatarDeleted, setAvatarDeleted] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { user } = await ProfileService.getProfile();
      setProfile(user);
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setPhone(user.phone_number ?? "");
      setUsername(user.username);
      setAvatarUri(user.profile_image_url);
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  // ── Seleccionar imagen ─────────────────────────────────────────────────────
  const showImageOptions = () => {
    const options: any[] = [
      { text: "Galería", onPress: pickFromGallery },
      { text: "Cámara", onPress: takePhoto },
    ];
    // Solo mostrar "Eliminar foto" si hay una foto actualmente
    if (avatarUri && !avatarDeleted) {
      options.push({
        text: "Eliminar foto",
        style: "destructive",
        onPress: confirmDeleteAvatar,
      });
    }
    options.push({ text: "Cancelar", style: "cancel" });
    Alert.alert("Foto de perfil", "¿Qué deseas hacer?", options);
  };

  const confirmDeleteAvatar = () => {
    Alert.alert(
      "Eliminar foto de perfil",
      "¿Estás seguro? Tu foto se eliminará permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setAvatarUri(null);
            setAvatarB64(null);
            setAvatarDeleted(true);
          },
        },
      ]
    );
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tu galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarB64(result.assets[0].base64 ?? null);
      setAvatarDeleted(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tu cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarB64(result.assets[0].base64 ?? null);
      setAvatarDeleted(false);
    }
  };

  // ── Guardar cambios ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Campo requerido", "El nombre no puede estar vacío.");
      return;
    }
    if (!lastName.trim()) {
      Alert.alert("Campo requerido", "El apellido no puede estar vacío.");
      return;
    }

    setSaving(true);
    try {
      // 1. Gestionar foto de perfil
      if (avatarDeleted && !avatarB64) {
        // El usuario eligió borrar la foto sin subir otra
        setUploadingImg(true);
        await ProfileService.deleteAvatar();
        setUploadingImg(false);
        setAvatarDeleted(false);
      } else if (avatarB64) {
        // El usuario subió una foto nueva
        setUploadingImg(true);
        const { avatar_url } = await ProfileService.uploadAvatar(avatarB64);
        setAvatarUri(avatar_url);
        setAvatarB64(null);
        setAvatarDeleted(false);
        setUploadingImg(false);
      }

      // 2. Actualizar datos del perfil
      const { user, message } = await ProfileService.updateProfile({
        first_name:   firstName.trim(),
        last_name:    lastName.trim(),
        phone_number: phone.trim() || undefined,
        username:     username.trim(),
      });

      setProfile(user);
      Alert.alert("¡Perfil actualizado! ✅", message, [
        {
          text: "OK",
          onPress: () => router.back(),
          // router.back() desmonta esta pantalla y devuelve el foco a perfil.tsx,
          // donde useFocusEffect recargará los datos automáticamente.
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error al guardar", err.message || "Inténtalo de nuevo");
    } finally {
      setSaving(false);
      setUploadingImg(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const roleLabel = profile?.user_type === "admin" ? "Administrador"
    : profile?.user_type === "provider" ? "Proveedor" : "Cliente";

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Avatar ──────────────────────────────── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrap} onPress={showImageOptions} activeOpacity={0.8}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              {/* Overlay de cámara / eliminar */}
              <View style={[styles.avatarOverlay, avatarDeleted && styles.avatarOverlayDelete]}>
                {uploadingImg ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : avatarDeleted ? (
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                ) : (
                  <Ionicons name="camera" size={20} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>
              {avatarUri ? "Toca para cambiar o eliminar" : "Toca para agregar una foto"}
            </Text>
            <View style={styles.rolePill}>
              <Ionicons
                name={profile?.user_type === "client" ? "person-outline" : "shield-checkmark-outline"}
                size={12}
                color={C.accent}
              />
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
          </View>

          {/* ── Formulario ──────────────────────────── */}
          <View style={styles.formSection}>

            <Text style={styles.sectionTitle}>Información personal</Text>
            <View style={styles.formCard}>
              <FieldRow
                icon="person-outline"
                label="Nombre *"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Tu nombre"
                autoCapitalize="words"
              />
              <View style={styles.fieldDivider} />
              <FieldRow
                icon="person-outline"
                label="Apellido *"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Tu apellido"
                autoCapitalize="words"
              />
              <View style={styles.fieldDivider} />
              <FieldRow
                icon="call-outline"
                label="Teléfono"
                value={phone}
                onChangeText={setPhone}
                placeholder="+504 9999-9999"
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Cuenta</Text>
            <View style={styles.formCard}>
              <FieldRow
                icon="at-outline"
                label="Usuario"
                value={username}
                onChangeText={setUsername}
                placeholder="nombre_usuario"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.fieldDivider} />
              {/* Email — solo lectura */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconWrap}>
                  <Ionicons name="mail-outline" size={18} color={C.textSoft} />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>Correo electrónico</Text>
                  <Text style={styles.fieldReadOnly}>{profile?.email}</Text>
                </View>
                <View style={styles.lockIcon}>
                  <Ionicons name="lock-closed-outline" size={14} color={C.textSoft} />
                </View>
              </View>
            </View>

            <Text style={styles.readOnlyNote}>
              <Ionicons name="information-circle-outline" size={13} color={C.textSoft} />
              {"  "}El correo electrónico no se puede modificar desde aquí.
            </Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-componente: fila de campo ──────────────────────────────────────────────
function FieldRow({
  icon, label, value, onChangeText, placeholder,
  keyboardType, autoCapitalize, autoCorrect,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconWrap}>
        <Ionicons name={icon} size={18} color={C.accent} />
      </View>
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textSoft}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "sentences"}
          autoCorrect={autoCorrect ?? true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accentLight,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontSize: T.heading, fontWeight: "800", color: C.primary,
  },
  saveBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: R.md, minWidth: 80, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: T.small },

  scrollContent: { paddingBottom: 40 },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: C.primary,
  },
  avatarWrap: {
    position: "relative",
    width: 100, height: 100, borderRadius: 50,
    marginBottom: 10,
  },
  avatarImg: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: C.accent,
  },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(1,182,239,0.2)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: C.accent,
  },
  avatarInitials: { color: "#fff", fontSize: 32, fontWeight: "800" },
  avatarOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.accent,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: C.primary,
  },
  avatarOverlayDelete: {
    backgroundColor: C.danger,
  },
  avatarHint: {
    fontSize: T.small, color: "rgba(255,255,255,0.6)",
    marginBottom: 10,
  },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(1,182,239,0.15)",
    borderWidth: 1, borderColor: "rgba(1,182,239,0.3)",
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: R.xxl,
  },
  rolePillText: { fontSize: 12, fontWeight: "700", color: C.accent },

  // Form
  formSection: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700",
    color: C.textMuted, textTransform: "uppercase",
    letterSpacing: 1.2, marginBottom: 8, paddingLeft: 4,
  },
  formCard: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    ...AppTheme.shadow.card,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  fieldDivider: { height: 1, backgroundColor: C.border, marginLeft: 56 },
  fieldRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  fieldIconWrap: {
    width: 28, alignItems: "center",
  },
  fieldContent: { flex: 1 },
  fieldLabel: {
    fontSize: 11, fontWeight: "600",
    color: C.textMuted, marginBottom: 3,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  fieldInput: {
    fontSize: T.body, color: C.text,
    padding: 0,
  },
  fieldReadOnly: {
    fontSize: T.body, color: C.textSoft,
  },
  lockIcon: { opacity: 0.5 },

  readOnlyNote: {
    fontSize: 12, color: C.textSoft,
    marginTop: -12, marginBottom: 20,
    paddingHorizontal: 4, lineHeight: 18,
  },
});