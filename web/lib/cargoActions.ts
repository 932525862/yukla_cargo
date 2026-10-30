import { api } from "./api";
import type { Cargo, CargoStatus } from "./types";

/**
 * Tanlangan yuklarni yangi holatga o'tkazadi (8 tadan guruhlab). Mijozga bot xabarini server yuboradi.
 * Qaytaradi: nechta muvaffaqiyatli va birinchi xato matni.
 */
export async function setStatus(
  items: Cargo[],
  status: CargoStatus,
  opts: { estimatedDelivery?: string; batchId?: string } = {},
): Promise<{ ok: number; failed: number; error?: string }> {
  let ok = 0;
  let failed = 0;
  let error: string | undefined;
  for (let i = 0; i < items.length; i += 8) {
    const res = await Promise.allSettled(
      items.slice(i, i + 8).map((c) => api.saveCargo({ barcode: c.barcode, senderId: c.senderId, status, ...opts })),
    );
    for (const r of res) {
      if (r.status === "fulfilled") ok++;
      else {
        failed++;
        error ??= r.reason instanceof Error ? r.reason.message : String(r.reason);
      }
    }
  }
  return { ok, failed, error };
}
