import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/api";
import { API_BASE_URL } from "@/lib/supabase";

export const AuthService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signup(email: string, password: string, name: string, role: "client" | "provider" = "client") {
    // El backend crea el usuario en Supabase Auth y en la tabla public.users
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Error al crear cuenta");
    }
    // Iniciar sesión automáticamente
    return AuthService.login(email, password);
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser() {
    return apiRequest<{ user: any }>("/auth/me");
  },
};
