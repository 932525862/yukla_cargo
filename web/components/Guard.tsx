"use client";

import { useAuth } from "@/lib/auth";
import type { PermKey } from "@/lib/types";
import { Empty } from "./ui";
import { PageHeader } from "./PageHeader";

/** Ruxsati yo'q hodim bo'limni to'g'ridan-to'g'ri manzil orqali ochsa ham ko'ra olmaydi */
export function Guard({ perm, admin, children }: { perm?: PermKey; admin?: boolean; children: React.ReactNode }) {
  const { can, isAdmin } = useAuth();
  const allowed = admin ? isAdmin : perm ? can(perm) : true;
  if (allowed) return <>{children}</>;
  return (
    <>
      <PageHeader title="Ruxsat yo'q" back />
      <Empty icon="lock" text="Bu bo'limga sizga ruxsat berilmagan. Bosh admin bilan bog'laning." />
    </>
  );
}
