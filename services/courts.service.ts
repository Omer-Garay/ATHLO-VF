import { apiRequest } from "@/lib/api";

export interface Court {
  field_id: number;
  field_name: string;
  sport_name: string;
  price_per_hour: number;
  rating: number;
  review_count: number;
  image_url: string | null;
  is_available: boolean;
  is_premium: boolean;
  surface_type: string | null;
  capacity: number | null;
  description: string | null;
  facility_name: string;
  city: string;
  address: string;
  has_lighting: boolean;
  has_changing_rooms: boolean;
  parking_available: boolean;
}

export interface TimeSlot {
  time_slot_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface SlotsResponse {
  slots: TimeSlot[];      // Cambié string[] por TimeSlot[] para que coincida con tu lógica
  is_closed_day?: boolean; 
  message?: string;
  schedule?: {            // Opcional: por si quieres mostrar el horario de apertura
    opening_time: string;
    closing_time: string;
  };
}

export const CourtsService = {
  async getFeaturedCourts(): Promise<{ courts: Court[] }> {
    return apiRequest("/courts/featured");
  },

  async getPopularCourts(): Promise<{ courts: Court[] }> {
    return apiRequest("/courts/popular");
  },

  async getAllCourts(sport?: string): Promise<{ courts: Court[] }> {
    const query = sport && sport !== "Todos" ? `?sport=${encodeURIComponent(sport)}` : "";
    return apiRequest(`/courts${query}`);
  },

  async getCourtById(fieldId: number): Promise<{ court: Court }> {
    return apiRequest(`/courts/${fieldId}`);
  },

  async getAvailableSlots(fieldId: number, date: string): Promise<SlotsResponse> {
    return apiRequest(`/courts/${fieldId}/slots?date=${date}`);
  },

  async searchCourts(query: string, sport?: string): Promise<{ courts: Court[] }> {
    const params = new URLSearchParams({ q: query });
    if (sport && sport !== "Todos") params.append("sport", sport);
    return apiRequest(`/courts/search?${params.toString()}`);
  },
};
