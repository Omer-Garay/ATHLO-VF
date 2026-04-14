import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthService } from "@/services/auth.service";
import { AppTheme } from "@/constants/theme";
import { AthloLogo } from "@/assets/AthloLogo";

const C = AppTheme.colors;
const R = AppTheme.radius;
const T = AppTheme.typography;

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "provider">("client");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert("Error", "Por favor ingresa tu nombre");
      return;
    }

    if (!isLogin && password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await AuthService.login(email.trim(), password);
      } else {
        await AuthService.signup(email.trim(), password, name.trim(), role);
        Alert.alert(
          "¡Cuenta creada!",
          `Tu cuenta de ${role === "provider" ? "proveedor" : "cliente"} fue creada exitosamente.`,
          [{ text: "OK" }]
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Error durante la autenticación");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setName("");
    setRole("client");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.logoSection}>
        <View style={styles.logoBg}>
          <AthloLogo size={170} variant="light" />
        </View>
        <Text style={styles.tagline}>Reserva tu cancha al instante</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          <View style={styles.card}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, isLogin && styles.tabActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                  Iniciar Sesión
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isLogin && styles.tabActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                  Crear Cuenta
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardSubtitle}>
              {isLogin ? "Bienvenido de vuelta" : "Únete y empieza a reservar"}
            </Text>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre completo</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color={C.accent} />
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    placeholderTextColor={C.textSoft}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={C.accent} />
                <TextInput
                  style={styles.input}
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={C.textSoft}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={C.accent} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={C.textSoft}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={C.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de cuenta</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, role === "client" && styles.roleBtnActive]}
                    onPress={() => setRole("client")}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={role === "client" ? "#fff" : C.textMuted}
                    />
                    <Text style={[styles.roleBtnText, role === "client" && styles.roleBtnTextActive]}>
                      Cliente
                    </Text>
                    <Text style={[styles.roleDesc, role === "client" && styles.roleDescActive]}>
                      Quiero reservar canchas
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleBtn, role === "provider" && styles.roleBtnActive]}
                    onPress={() => setRole("provider")}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={role === "provider" ? "#fff" : C.textMuted}
                    />
                    <Text style={[styles.roleBtnText, role === "provider" && styles.roleBtnTextActive]}>
                      Proveedor
                    </Text>
                    <Text style={[styles.roleDesc, role === "provider" && styles.roleDescActive]}>
                      Tengo canchas para alquilar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isLogin ? "log-in-outline" : "person-add-outline"}
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.primaryBtnText}>
                    {isLogin ? "Iniciar Sesión" : `Crear Cuenta ${role === "provider" ? "Proveedor" : "Cliente"}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.toggleBtn} onPress={switchMode}>
              <Text style={styles.toggleText}>
                {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                <Text style={styles.toggleLink}>
                  {isLogin ? "Regístrate gratis" : "Inicia sesión"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Reserva canchas deportivas en Honduras</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.white,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 36,
  },
  logoSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: C.white,
  },
  logoBg: {
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 0,
    borderWidth: 0,
    borderColor: "transparent",
  },
  tagline: {
    color: C.textMuted,
    fontSize: T.small,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: R.xl,
    padding: 24,
    ...AppTheme.shadow.strong,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: C.inputBg,
    borderRadius: R.md,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: R.sm,
  },
  tabActive: {
    backgroundColor: C.primary,
    ...AppTheme.shadow.card,
  },
  tabText: {
    fontSize: T.small,
    fontWeight: "600",
    color: C.textMuted,
  },
  tabTextActive: {
    color: "#fff",
  },
  cardSubtitle: {
    fontSize: T.small,
    color: C.textMuted,
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: T.small,
    fontWeight: "600",
    color: C.text,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    fontSize: T.body,
    color: C.text,
  },
  inputFlex: { flex: 1 },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: R.md,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    gap: 4,
  },
  roleBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  roleBtnText: {
    fontSize: T.small,
    fontWeight: "700",
    color: C.textMuted,
  },
  roleBtnTextActive: {
    color: "#fff",
  },
  roleDesc: {
    fontSize: 11,
    color: C.textSoft,
    textAlign: "center",
  },
  roleDescActive: {
    color: "rgba(255,255,255,0.8)",
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: "#fff",
    fontSize: T.body,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: T.small,
    color: C.textSoft,
  },
  toggleBtn: { alignItems: "center" },
  toggleText: {
    fontSize: T.small,
    color: C.textMuted,
  },
  toggleLink: {
    color: C.primary,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    color: C.textSoft,
    fontSize: T.xs,
    marginTop: 24,
    letterSpacing: 0.3,
  },
});
