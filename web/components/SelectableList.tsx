"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Cargo } from "@/lib/types";
import { Button, Empty, ErrorBox, Spinner, TextInput } from "./ui";

/** Qidiruv paneli (barkod yoki mijoz ID bo'yicha) */
export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <TextInput icon="search" placeholder="ID yoki pochta kodi bo'yicha qidirish" value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function ListState({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <div className="flex justify-center py-16 text-brand">
        <Spinner className="size-8" />
      </div>
    );
  if (error) return <ErrorBox message={(error as Error).message} onRetry={onRetry} />;
  if (empty) return <Empty text={emptyText} />;
  return null;
}

/** Pastdagi (menyu ustidagi) amal paneli */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-[calc(4.6rem+var(--safe-bottom))] z-20 flex gap-2 px-3 pt-2">{children}</div>;
}

export function useSelection() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return {
    sel,
    has: (id: string) => sel.has(id),
    toggle: (id: string, on: boolean) =>
      setSel((s) => {
        const n = new Set(s);
        on ? n.add(id) : n.delete(id);
        return n;
      }),
    setMany: (ids: string[], on: boolean) =>
      setSel((s) => {
        const n = new Set(s);
        ids.forEach((i) => (on ? n.add(i) : n.delete(i)));
        return n;
      }),
    replace: (ids: string[]) => setSel(new Set(ids)),
    clear: () => setSel(new Set()),
  };
}

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["cargos"] });
}

export const pick = (all: Cargo[], sel: Set<string>) => all.filter((c) => sel.has(c.barcode));

export { Button };
