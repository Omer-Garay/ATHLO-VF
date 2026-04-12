import { apiRequest } from "@/lib/api";

export interface PaymentMethod {
  payment_method_id: number;
  payment_type: "credit_card" | "debit_card" | "cash" | "bank_transfer" | "digital_wallet";
  card_last_four: string | null;
  card_expiry_month: number | null;
  card_expiry_year: number | null;
  card_holder_name: string | null;
  is_default: boolean;
  is_active: boolean;
}

export const PaymentMethodsService = {
  async getMyMethods(): Promise<{ methods: PaymentMethod[] }> {
    return apiRequest("/payment-methods");
  },

  async addMethod(data: {
    payment_type: string;
    card_last_four?: string;
    card_expiry_month?: number;
    card_expiry_year?: number;
    card_holder_name?: string;
    token_reference?: string;
  }): Promise<{ payment_method_id: number }> {
    return apiRequest("/payment-methods", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async setDefault(id: number): Promise<void> {
    return apiRequest(`/payment-methods/${id}/default`, { method: "PATCH" });
  },

  async remove(id: number): Promise<void> {
    return apiRequest(`/payment-methods/${id}`, { method: "DELETE" });
  },
};
