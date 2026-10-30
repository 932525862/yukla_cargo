"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { beep } from "@/lib/feedback";
import { matchesQuery, useCargosByStatus } from "@/lib/hooks";
import { setStatus } from "@/lib/cargoActions";
import { useAuth } from "@/lib/auth";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/PageHeader";
import { CargoCard } from "@/components/CargoCard";
import dynamic from "next/dynamic";

// Kamera kutubxonasi (zxing) faqat kerak bo'lganda yuklanadi
const Scanner = dynamic(() => import("@/components/Scanner").then((m) => m.Scanner), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />,
});
import { Sheet } from "@/components/Sheet";
import { DateRange } from "@/components/DateRange";
import { Icon } from "@/components/icons";
import { ActionBar, ListState, SearchBar, pick, useRefresh, useSelection } from "@/components/SelectableList";
import { Button, TextInput, cn } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function TopshirishPage() {
  return (
    <Guard perm="topshirish">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = useRefresh();
  const { can } = useAuth();
  const uzb = useCargosByStatus("uzbOmbor");
  const done = useCargosByStatus("topshirildi");
  const s = useSelection();
  const [tab, setTab] = useState<"uzb" | "done">("uzb");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const cur = tab === "uzb" ? uzb : done;
  const list = useMemo(() => {
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return cur.items.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= start && t <= end && matchesQuery(c, q);
    });
  }, [cur.items, q, from, to]);

  /** Skanerlangan kodni FAQAT yo'ldagi yuklar ichidan topib UZB omboriga o'tkazadi */
  async function receiveByCode(raw: string) {
    const code = raw.trim().toLowerCase();
    if (!code || lock.current) return;
    lock.current = true;
    try {
      const all = await qc.fetchQuery({ queryKey: ["cargos"], queryFn: api.cargos, staleTime: 0 });
      const hit = all.find((c) => c.barcode.toLowerCase() === code);
      if (!hit) throw new Error("Ushbu pochta kodi topilmadi!");
      if (hit.status !== "yolda") throw new Error("Ushbu yuk yo'ldagi tovarlar ro'yxatida emas! (Boshqa holatda)");
      await api.saveCargo({ barcode: hit.barcode, senderId: hit.senderId, status: "uzbOmbor" });
      beep();
      toast(`📦 Yuk UZB omboriga qabul qilindi!\n${hit.barcode} · Mijoz: ${hit.senderId}`, "ok");
      setScanOpen(false);
      setManual("");
      refresh();
    } catch (e) {
      beep(false);
      toast(`❌ ${e instanceof Error ? e.message : "Xatolik"}`, "err");
    } finally {
      setTimeout(() => (lock.current = false), 1200); // bir kodni ketma-ket qayta o'qimaslik uchun
    }
  }

  async function deliver() {
    setBusy(true);
    const r = await setStatus(pick(uzb.items, s.sel), "topshirildi");
    setBusy(false);
    s.clear();
    refresh();
    if (r.failed) toast(`${r.ok} ta topshirildi, ${r.failed} ta xato: ${r.error}`, "err");
    else toast("Mijozga muvaffaqiyatli topshirildi ✓", "ok");
  }

  return (
    <>
      <PageHeader title="Topshirish punkti" subtitle="O'zbekiston ombori va topshirilgan yuklar" />

      <div className="px-3 pt-3">
        <div className="grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1" role="tablist">
          {(
            [
              ["uzb", `UZB ombor (${uzb.items.length})`],
              ["done", `Topshirilgan (${done.items.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("min-h-11 rounded-xl text-sm font-bold transition-colors", tab === k ? "bg-white text-ink shadow-sm" : "text-ink-soft")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-3 pb-0">
        {tab === "uzb" && (
          <div className="card border-violet/25 bg-gradient-to-br from-violet/10 to-brand/5 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-violet/15 text-violet">
                <Icon name="scan" size={22} />
              </span>
              <div>
                <h2 className="font-extrabold">UZB omboriga chiqim qilish</h2>
                <p className="text-xs text-ink-soft">Pochta kodini skanerlab, yukni UZB omboriga qabul qiling</p>
              </div>
            </div>
            {can("yolda") ? (
              <Button full variant="violet" icon="scan" className="mt-3" onClick={() => setScanOpen(true)}>
                Chiqim qilish (skanerlash)
              </Button>
            ) : (
              <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-ink-soft">Bu amal uchun «Yo&apos;lda» ruxsati kerak.</p>
            )}
          </div>
        )}
        <SearchBar value={q} onChange={setQ} />
        <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      <ListState loading={cur.isLoading} error={cur.error} empty={list.length === 0} emptyText={tab === "uzb" ? "UZB omborida yuk yo'q" : "Topshirilgan yuk yo'q"} onRetry={cur.refetch} />
      <ul className="space-y-2.5 p-3">
        {list.map((c) => (
          <li key={c.barcode}>
            {tab === "uzb" ? (
              <CargoCard cargo={c} selected={s.has(c.barcode)} onToggle={(v) => s.toggle(c.barcode, v)} />
            ) : (
              <CargoCard cargo={c} />
            )}
          </li>
        ))}
      </ul>

      {tab === "uzb" && s.sel.size > 0 && (
        <ActionBar>
          <Button full loading={busy} icon="check" onClick={deliver}>
            Mijozga topshirish ({s.sel.size})
          </Button>
        </ActionBar>
      )}

      <Sheet open={scanOpen} onClose={() => setScanOpen(false)} title="Chiqim qilish">
        <p className="-mt-1 pb-3 text-sm text-ink-soft">Yo&apos;ldagi yukning shtrix kodini kameraga ko&apos;rsating — u avtomatik UZB omboriga qabul qilinadi.</p>
        <Scanner active={scanOpen} onDetect={receiveByCode} className="aspect-[4/3] w-full rounded-2xl shadow-lg ring-1 ring-slate-900/10" />
        <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-mute">
          <span className="h-px flex-1 bg-line" />
          yoki qo&apos;lda kiriting
          <span className="h-px flex-1 bg-line" />
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            receiveByCode(manual);
          }}
        >
          <div className="flex-1">
            <TextInput icon="scan" placeholder="Pochta kodi" aria-label="Pochta kodi" value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="characters" autoCorrect="off" />
          </div>
          <Button type="submit" disabled={!manual.trim()} className="px-6">
            Qabul
          </Button>
        </form>
      </Sheet>
    </>
  );
}
