"use client";

import { useMemo, useState } from "react";
import { addDays, fmtDate, toInputDate } from "@/lib/format";
import { matchesQuery, useCargosByStatus } from "@/lib/hooks";
import { setStatus } from "@/lib/cargoActions";
import { api } from "@/lib/api";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/PageHeader";
import { CargoCard } from "@/components/CargoCard";
import { Sheet } from "@/components/Sheet";
import { DateRange } from "@/components/DateRange";
import { ActionBar, ListState, SearchBar, pick, useRefresh, useSelection } from "@/components/SelectableList";
import { Button, TextInput } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function OmborPage() {
  return (
    <Guard perm="ombor">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const toast = useToast();
  const refresh = useRefresh();
  const { items, isLoading, error, refetch } = useCargosByStatus("omborda");
  const s = useSelection();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dispatch, setDispatch] = useState(false);
  const [remove, setRemove] = useState(false);
  const [date, setDate] = useState(toInputDate(addDays(3)));
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return items.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= start && t <= end && matchesQuery(c, q);
    });
  }, [items, q, from, to]);

  // Sana oralig'i tanlansa, shu oraliqdagi barcha yuklar avtomatik belgilanadi
  const onRange = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    if (f && t) {
      const start = new Date(`${f}T00:00:00`).getTime();
      const end = new Date(`${t}T23:59:59`).getTime();
      s.replace(items.filter((c) => { const x = new Date(c.createdAt).getTime(); return x >= start && x <= end; }).map((c) => c.barcode));
    } else s.clear();
  };

  const chosen = pick(items, s.sel);
  const allSelected = list.length > 0 && list.every((c) => s.has(c.barcode));

  async function doDispatch() {
    setBusy(true);
    const r = await setStatus(chosen, "yolda", {
      estimatedDelivery: new Date(`${date}T00:00:00`).toISOString(),
      batchId: `Partiya ${fmtDate(new Date())}`,
    });
    setBusy(false);
    setDispatch(false);
    s.clear();
    refresh();
    if (r.failed) toast(`${r.ok} ta o'tkazildi, ${r.failed} ta xato: ${r.error}`, "err");
    else toast(`${r.ok} ta yuk yo'lga chiqarildi ✓`, "ok");
  }

  async function doRemove() {
    setBusy(true);
    const res = await Promise.allSettled(chosen.map((c) => api.deleteCargo(c.barcode)));
    setBusy(false);
    setRemove(false);
    s.clear();
    refresh();
    const failed = res.filter((r) => r.status === "rejected").length;
    toast(failed ? `${failed} ta yuk o'chirilmadi` : `${res.length} ta yuk o'chirildi`, failed ? "err" : "ok");
  }

  return (
    <>
      <PageHeader title="Ombordagi yuklar" subtitle={`${items.length} ta yuk`} />
      <div className="space-y-2 p-3 pb-0">
        <SearchBar value={q} onChange={setQ} />
        <DateRange from={from} to={to} onChange={onRange} />
        {list.length > 0 && (
          <button className="py-1 text-sm font-semibold text-brand" onClick={() => s.setMany(list.map((c) => c.barcode), !allSelected)}>
            {allSelected ? "Belgilarni olib tashlash" : `Hammasini belgilash (${list.length})`}
          </button>
        )}
      </div>

      <ListState loading={isLoading} error={error} empty={list.length === 0} emptyText="Omborda yuk yo'q" onRetry={refetch} />
      <ul className="space-y-2.5 p-3">
        {list.map((c) => (
          <li key={c.barcode}>
            <CargoCard cargo={c} selected={s.has(c.barcode)} onToggle={(v) => s.toggle(c.barcode, v)} />
          </li>
        ))}
      </ul>

      {s.sel.size > 0 && (
        <ActionBar>
          <Button variant="secondary" icon="trash" className="text-red-500" onClick={() => setRemove(true)} aria-label="O'chirish" />
          <Button full variant="primary" icon="truck" onClick={() => setDispatch(true)}>
            Yo&apos;lga chiqarish ({s.sel.size})
          </Button>
        </ActionBar>
      )}

      <Sheet
        open={dispatch}
        onClose={() => setDispatch(false)}
        title="Yo'lga chiqarish"
        footer={<Button full loading={busy} icon="truck" onClick={doDispatch}>{chosen.length} ta yukni yo&apos;lga chiqarish</Button>}
      >
        <p className="pb-3 text-sm text-ink-soft">Mijoz ID kiritgan bo&apos;lsa, Telegram botda yuk holati va kutilgan sana ko&apos;rinadi.</p>
        <TextInput label="Kutilayotgan yetkazish sanasi" type="date" min={toInputDate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
      </Sheet>

      <Sheet
        open={remove}
        onClose={() => setRemove(false)}
        title="Yuklarni o'chirasizmi?"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setRemove(false)}>Yo&apos;q</Button>
            <Button variant="danger" loading={busy} onClick={doRemove}>O&apos;chirish</Button>
          </div>
        }
      >
        <p className="pb-2 text-sm text-ink-soft">{chosen.length} ta yuk va ularning rasmlari butunlay o&apos;chiriladi. Bu amalni qaytarib bo&apos;lmaydi.</p>
      </Sheet>
    </>
  );
}
