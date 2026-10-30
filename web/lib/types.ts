export type CargoStatus = "omborda" | "yolda" | "uzbOmbor" | "topshirildi";

export const STATUS_LABEL: Record<CargoStatus, string> = {
  omborda: "Omborda",
  yolda: "Yo'lda",
  uzbOmbor: "UZB omborda",
  topshirildi: "Topshirildi",
};

export interface Cargo {
  id: string;
  barcode: string;
  senderId: string;
  status: CargoStatus;
  batchId: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  imageUrls: string[];
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  telegram: string;
  createdBy: string;
  createdAt: string;
}

export interface StaffUser {
  id: number;
  login: string;
  fullName: string;
  role: "admin" | "staff";
  permissions: string[];
  active: boolean;
}

/** Hodim ruxsatlari (server bilan bir xil kalitlar) */
export const PERMS = {
  scan: "Skaner",
  ombor: "Ombor",
  yolda: "Yo'lda",
  topshirish: "Topshirish",
  clients: "Mijozga ID",
} as const;
export type PermKey = keyof typeof PERMS;

export interface BotInfo {
  enabled: boolean;
  username?: string;
  name?: string;
  error?: string;
}
