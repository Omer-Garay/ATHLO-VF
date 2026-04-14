import { apiRequest } from "@/lib/api";

export interface Booking {
  booking_id: number;
  field_name: string;
  field_id: number;
  facility_name: string;
  city: string;
  sport_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  final_price: number;
  discount_applied: number;
  booking_status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  cancellation_reason: string | null;
  payment_status: "pending" | "completed" | "cancelled" | "failed";
  payment_method: string | null;
  number_of_players: number | null;
  notes: string | null;
  qr_code_token: string | null;
  created_at: string;
}

export interface CreateBookingPayload {
  field_id: number;
  booking_date: string;       // "YYYY-MM-DD"
  start_time: string;         // "HH:MM"
  end_time: string;           // "HH:MM"
  number_of_players?: number;
  payment_method_id?: number;
  promo_code?: string;
  notes?: string;
}

export const BookingsService = {
  async getMyBookings(): Promise<{ bookings: Booking[] }> {
    return apiRequest("/bookings");
  },

  async getBookingById(id: number): Promise<{ booking: Booking }> {
    return apiRequest(`/bookings/${id}`);
  },

  async createBooking(payload: CreateBookingPayload): Promise<{ booking_id: number; message: string }> {
    return apiRequest("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async cancelBooking(id: number, reason: string): Promise<{ message: string }> {
    return apiRequest(`/bookings/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async rateBooking(id: number, rating: number): Promise<{ message: string }> {
    return apiRequest(`/bookings/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    });
  },
};
