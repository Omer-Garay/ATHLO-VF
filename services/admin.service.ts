import { apiRequest } from "@/lib/api";

export interface AdminStats {
  total_courts: number;
  total_bookings: number;
  total_revenue: number;
  active_bookings: number;
  avg_rating: number;
}

export interface AdminCourt {
  field_id: number;
  field_name: string;
  sport_name: string;
  price_per_hour: number;
  is_available: boolean;
  is_premium: boolean;
  surface_type: string;
  capacity: number;
  description: string;
  facility_name: string;
  city: string;
  rating: number;
  review_count: number;
  image_url: string | null;
}

export interface AdminBooking {
  booking_id: number;
  client_name: string;
  client_email: string;
  field_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  final_price: number;
  discount_applied: number;
  booking_status: string;
  payment_status: string;
}

export interface Facility {
  facility_id: number;
  facility_name: string;
  city: string;
  address: string;
  is_active: boolean;
}

export interface SportType {
  sport_type_id: number;
  sport_name: string;
  icon_url: string | null;
}

export interface CourtSchedule {
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  is_closed?: boolean;
}

export const AdminService = {
  async getStats(): Promise<{ stats: AdminStats }> {
    return apiRequest("/admin/stats");
  },

  async getMyCourts(): Promise<{ courts: AdminCourt[] }> {
    return apiRequest("/admin/courts");
  },

  async getAllBookings(status?: string): Promise<{ bookings: AdminBooking[] }> {
    const q = status ? `?status=${status}` : "";
    return apiRequest(`/admin/bookings${q}`);
  },

  async getFacilities(): Promise<{ facilities: Facility[] }> {
    return apiRequest("/admin/facilities");
  },

  async getSportTypes(): Promise<{ sport_types: SportType[] }> {
    return apiRequest("/admin/sport-types");
  },

  async createCourt(data: {
    field_name: string;
    facility_id: number;
    sport_type_id: number;
    price_per_hour: number;
    surface_type?: string;
    capacity?: number;
    description?: string;
    is_premium?: boolean;
    schedules?: CourtSchedule[];
  }): Promise<{ field_id: number; message: string }> {
    return apiRequest("/admin/courts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateCourt(
    fieldId: number,
    data: Partial<AdminCourt>
  ): Promise<{ message: string }> {
    return apiRequest(`/admin/courts/${fieldId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteCourt(fieldId: number): Promise<{ message: string }> {
    return apiRequest(`/admin/courts/${fieldId}`, { method: "DELETE" });
  },

  async toggleCourtAvailability(fieldId: number, isAvailable: boolean): Promise<{ message: string }> {
    return apiRequest(`/admin/courts/${fieldId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ is_available: isAvailable }),
    });
  },

  async getCourtSchedules(fieldId: number): Promise<{ schedules: CourtSchedule[] }> {
    return apiRequest(`/admin/courts/${fieldId}/schedules`);
  },

  async updateCourtSchedules(fieldId: number, schedules: CourtSchedule[]): Promise<{ message: string }> {
    return apiRequest(`/admin/courts/${fieldId}/schedules`, {
      method: "PUT",
      body: JSON.stringify({ schedules }),
    });
  },

  async uploadCourtImage(
    fieldId: number,
    imageBase64: string,
    mimeType: string = "image/jpeg"
  ): Promise<{ image_url: string; message: string }> {
    return apiRequest(`/admin/courts/${fieldId}/image`, {
      method: "POST",
      body: JSON.stringify({ image_base64: imageBase64, mime_type: mimeType }),
    });
  },

  async getPayouts(): Promise<{ payouts: any[] }> {
    return apiRequest("/admin/payouts");
  },
};
