"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/format";
import { matchesQuery, useCargosByStatus } from "@/lib/hooks";
import { setStatus } from "@/lib/cargoActions";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/PageHeader";
import { CargoCard } from "@/components/CargoCard";
import { Icon } from "@/components/icons";
import { ActionBar, ListState, SearchBar, pick, useRefresh, useSelection } from "@/components/SelectableList";
import { Button, Checkbox, cn } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function YoldaPage() {
  return (
    <Guard perm="yolda">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const toast = useToast();
  const refresh = useRefresh();
  const { items, isLoading, error, refetch } = useCargosByStatus("yolda");
  const s = useSelection();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Yuklar partiyalar bo'yicha guruhlanadi
  const groups = useMemo(() => {
    const m = new Map<string, typeof items>();
    for (const c of items.filter((c) => matchesQuery(c, q))) {
      const key = c.batchId || `Partiya (${fmtDate(c.createdAt)})`;
      m.set(key, [...(m.get(key) || []), c]);
    }
    return [...m.entries()];
  }, [items, q]);

  const toggleOpen = (k: string) =>
    setOpen((o) => {
      const n = new Set(o);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  async function receive() {
    setBusy(true);
    const r = await setStatus(pick(items, s.sel), "uzbOmbor");
    setBusy(false);
    s.clear();
    refresh();
    if (r.failed) toast(`${r.ok} ta o'tkazildi, ${r.failed} ta xato: ${r.error}`, "err");
    else toast(`${r.ok} ta yuk UZB omboriga o'tkazildi ✓`, "ok");
  }

  return (
    <>
      <PageHeader title="Yo'ldagi yuklar" subtitle={`${items.length} ta yuk`} />
      <div className="p-3 pb-0">
        <SearchBar value={q} onChange={setQ} />
      </div>

      <ListState loading={isLoading} error={error} empty={groups.length === 0} emptyText="Yo'lda yuk yo'q" onRetry={refetch} />
      <div className="space-y-2.5 p-3">
        {groups.map(([name, list]) => {
          const expanded = open.has(name) || q.trim() !== "";
          const all = list.every((c) => s.has(c.barcode));
          return (
            <section key={name} className="card overflow-hidden">
              <div className="flex items-center gap-3 p-3.5">
                <button onClick={() => toggleOpen(name)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-accent">
                    <Icon name="truck" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{name}</span>
                    <span className="block text-xs text-ink-soft">Tarkibida {list.length} ta yuk</span>
                  </span>
                  <Icon name="down" size={18} className={cn("text-ink-mute transition-transform", expanded && "rotate-180")} />
                </button>
                <Checkbox checked={all} onChange={(v) => s.setMany(list.map((c) => c.barcode), v)} label="Partiyani belgilash" />
              </div>
              {expanded && (
                <ul className="space-y-2.5 border-t border-line bg-canvas p-2.5">
                  {list.map((c) => (
                    <li key={c.barcode}>
                      <CargoCard cargo={c} selected={s.has(c.barcode)} onToggle={(v) => s.toggle(c.barcode, v)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {s.sel.size > 0 && (
        <ActionBar>
          <Button full loading={busy} variant="violet" icon="inbox" onClick={receive}>
            UZB omborga o&apos;tkazish ({s.sel.size})
          </Button>
        </ActionBar>
      )}
    </>
  );
}
