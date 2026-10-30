import type { BotInfo, Cargo, CargoStatus, Client, StaffUser } from "./types";

const TOKEN_KEY = "cargo_token";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) || ""),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Sessiya tugaganda (401) chaqiriladi — AuthProvider shu orqali login sahifasiga qaytaradi */
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError("Serverga ulanib bo'lmadi. Internetni tekshiring", 0);
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(body?.error || `Server xatosi (${res.status})`, res.status);
  }
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export const api = {
  login: (login: string, password: string) =>
    request<{ token: string; user: StaffUser }>("/api/auth/login", json("POST", { login, password })),
  me: () => request<StaffUser>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  cargos: () => request<Cargo[]>("/api/cargos"),
  /** Yuk yaratish yoki holatini o'zgartirish (barkod bo'yicha) */
  saveCargo: (d: {
    barcode: string;
    senderId: string;
    status: CargoStatus;
    estimatedDelivery?: string;
    batchId?: string;
    images?: Blob[];
  }) => {
    const f = new FormData();
    f.append("barcode", d.barcode);
    f.append("senderId", d.senderId);
    f.append("status", d.status);
    if (d.estimatedDelivery) f.append("estimatedDelivery", d.estimatedDelivery);
    if (d.batchId) f.append("batchId", d.batchId);
    (d.images || []).forEach((b, i) => f.append("images", b, `${d.barcode}_${i + 1}.jpg`));
    return request<Cargo>("/api/cargos", { method: "POST", body: f });
  },
  deleteCargo: (barcode: string) =>
    request<void>(`/api/cargos/${encodeURIComponent(barcode)}`, { method: "DELETE" }),

  clients: (q = "") => request<Client[]>(`/api/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createClient: (d: { firstName: string; lastName: string; phone: string; telegram: string }) =>
    request<Client & { created: boolean }>("/api/clients", json("POST", d)),

  staff: () => request<StaffUser[]>("/api/staff"),
  createStaff: (d: { login: string; fullName: string; password: string; permissions: string[] }) =>
    request<StaffUser>("/api/staff", json("POST", d)),
  updateStaff: (
    id: number,
    d: { fullName?: string; password?: string; permissions?: string[]; active?: boolean },
  ) => request<StaffUser>(`/api/staff/${id}`, json("PUT", d)),

  bot: () => request<BotInfo>("/api/bot"),
  botTest: (chatId: string) => request<{ ok: boolean }>("/api/bot/test", json("POST", { chatId })),
};
