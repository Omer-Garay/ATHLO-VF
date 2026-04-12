import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(auth)",
};

export default function RootLayout() {
  useEffect(() => {
    // Verificar sesión existente al arrancar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/(tabs)");
      else router.replace("/(auth)/login");
    });

    // Escuchar cambios de auth para redirigir
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/(tabs)");
      } else if (event === "SIGNED_OUT") {
        router.replace("/(auth)/login");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="screens/reserve"
          options={{ presentation: "card", animation: Platform.OS === "web" ? "fade" : "slide_from_right" }}
        />
        <Stack.Screen
          name="screens/all-courts"
          options={{ presentation: "card", animation: Platform.OS === "web" ? "fade" : "slide_from_right" }}
        />
        <Stack.Screen
          name="screens/admin"
          options={{ presentation: Platform.OS === "web" ? "card" : "modal", animation: Platform.OS === "web" ? "fade" : "slide_from_bottom" }}
        />
        <Stack.Screen
          name="screens/payment-methods"
          options={{ presentation: "card", animation: Platform.OS === "web" ? "fade" : "slide_from_right" }}
        />
        <Stack.Screen
          name="screens/settings"
          options={{ presentation: "card", animation: Platform.OS === "web" ? "fade" : "slide_from_right" }}
        />
        <Stack.Screen
          name="screens/edit-profile"
          options={{ presentation: "card", animation: Platform.OS === "web" ? "fade" : "slide_from_right" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
