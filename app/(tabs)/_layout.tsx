import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "@/constants/theme";
import { Platform } from "react-native";

const C = AppTheme.colors;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textSoft,
        tabBarStyle: {
          height: Platform.OS === "ios" ? 88 : 70,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          backgroundColor: C.white,
          borderTopColor: C.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: "Reservas",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
