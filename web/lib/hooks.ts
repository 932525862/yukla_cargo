"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Cargo, CargoStatus, Client } from "./types";

/** Barcha yuklar. Boshqa hodimlar o'zgartirishlarini ko'rish uchun har 20 soniyada yangilanadi */
export function useCargos() {
  return useQuery({ queryKey: ["cargos"], queryFn: api.cargos, refetchInterval: 20_000 });
}

export function useCargosByStatus(status: CargoStatus) {
  const q = useCargos();
  const items = useMemo(() => (q.data || []).filter((c) => c.status === status), [q.data, status]);
  return { ...q, items };
}

/** Mijoz ID -> mijoz (kartalarda ism, telefon, telegram ko'rsatish uchun) */
export function useClientMap() {
  const q = useQuery({ queryKey: ["clients", ""], queryFn: () => api.clients("") });
  return useMemo(() => {
    const m = new Map<string, Client>();
    (q.data || []).forEach((c) => m.set(c.id.toUpperCase(), c));
    return m;
  }, [q.data]);
}

export const matchesQuery = (c: Cargo, q: string) => {
  const s = q.trim().toLowerCase();
  return !s || c.barcode.toLowerCase().includes(s) || c.senderId.toLowerCase().includes(s);
};
