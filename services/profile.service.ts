import { apiRequest } from "@/lib/api";

export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  profile_image_url: string | null;
  user_type: "client" | "provider" | "admin";
  created_at: string;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  username?: string;
}

export const ProfileService = {
  /** GET /profile — Datos completos del usuario autenticado */
  async getProfile(): Promise<{ user: UserProfile }> {
    return apiRequest("/profile");
  },

  /** PUT /profile — Actualizar nombre, apellido, teléfono o username */
  async updateProfile(data: UpdateProfilePayload): Promise<{ user: UserProfile; message: string }> {
    return apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /** POST /profile/avatar — Subir foto de perfil en base64 */
  async uploadAvatar(
    imageBase64: string,
    mimeType: string = "image/jpeg"
  ): Promise<{ avatar_url: string; message: string }> {
    return apiRequest("/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ image_base64: imageBase64, mime_type: mimeType }),
    });
  },

  /** DELETE /profile/avatar — Eliminar foto de perfil */
  async deleteAvatar(): Promise<{ message: string }> {
    return apiRequest("/profile/avatar", {
      method: "DELETE",
    });
  },
};
