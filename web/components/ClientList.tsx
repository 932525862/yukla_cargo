"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { copyText } from "@/lib/feedback";
import type { Client } from "@/lib/types";
import { Icon } from "./icons";
import { Empty, ErrorBox, Spinner, TextInput } from "./ui";
import { useToast } from "./Toast";

/** Mijozlar ro'yxati + qidiruv. `onPick` berilsa, mijozni tanlash rejimi (skaner uchun). */
export function ClientList({ onPick }: { onPick?: (c: Client) => void }) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 250);
    return () => clearTimeout(t);
  }, [input]);

  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["clients", q], queryFn: () => api.clients(q) });

  return (
    <div>
      <div className="p-3">
        <TextInput icon="search" placeholder="ID, ism, telefon yoki telegram" value={input} onChange={(e) => setInput(e.target.value)} />
      </div>
      {isLoading && (
        <div className="flex justify-center py-10 text-brand">
          <Spinner className="size-7" />
        </div>
      )}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <Empty icon="users" text="Mijozlar topilmadi" />}
      <ul className="space-y-2 px-3 pb-4">
        {data?.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => {
                if (onPick) return onPick(c);
                copyText(c.id);
                toast(`${c.id} nusxalandi`, "ok");
              }}
              className="card flex w-full items-center gap-3 p-3.5 text-left active:bg-slate-50"
            >
              <span className="rounded-lg bg-brand-bg px-2.5 py-1.5 text-sm font-extrabold text-brand">{c.id}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {c.firstName} {c.lastName}
                </span>
                <span className="block truncate text-[13px] text-ink-soft">
                  {c.phone}
                  {c.telegram && `  ·  @${c.telegram}`}
                </span>
                {c.createdBy && <span className="block truncate text-xs text-ink-mute">Qo&apos;shdi: {c.createdBy}</span>}
              </span>
              <Icon name={onPick ? "right" : "copy"} size={18} className="text-ink-mute" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
