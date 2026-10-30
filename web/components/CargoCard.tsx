"use client";

import { useState } from "react";
import type { Cargo, CargoStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Icon } from "./icons";
import { Badge, Checkbox, IconButton, cn } from "./ui";
import { ClientContact } from "./ClientContact";
import { Lightbox } from "./Lightbox";

const STATUS_COLOR: Record<CargoStatus, "blue" | "orange" | "violet" | "green"> = {
  omborda: "blue",
  yolda: "orange",
  uzbOmbor: "violet",
  topshirildi: "green",
};

export function CargoCard({
  cargo,
  selected,
  onToggle,
  onDelete,
}: {
  cargo: Cargo;
  /** undefined bo'lsa tanlash tugmasi chiqmaydi */
  selected?: boolean;
  onToggle?: (v: boolean) => void;
  onDelete?: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const selectable = onToggle !== undefined;

  return (
    <article
      onClick={selectable ? () => onToggle(!selected) : undefined}
      className={cn("card p-4 transition-colors", selectable && "cursor-pointer", selected && "border-brand bg-brand-bg/40 ring-1 ring-brand")}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-bg text-brand">
          <Icon name="package" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-all font-mono text-base font-bold leading-tight">{cargo.barcode}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge color={STATUS_COLOR[cargo.status]}>{STATUS_LABEL[cargo.status]}</Badge>
            <span className="text-sm font-extrabold text-brand">{cargo.senderId}</span>
          </div>
        </div>
        {selectable && <Checkbox checked={!!selected} onChange={onToggle} label="Tanlash" />}
        {onDelete && !selectable && (
          <IconButton
            icon="trash"
            label="O'chirish"
            className="text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
        )}
      </div>

      <ClientContact clientId={cargo.senderId} />

      <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-ink-soft">
        <div className="flex items-center gap-2">
          <Icon name="calendar" size={14} className="text-ink-mute" />
          Qabul: <b className="font-semibold text-ink">{fmtDateTime(cargo.createdAt)}</b>
        </div>
        {cargo.estimatedDelivery && cargo.status === "yolda" && (
          <div className="flex items-center gap-2 text-accent">
            <Icon name="truck" size={14} />
            Kutilayotgan yetkazish: <b>{fmtDate(cargo.estimatedDelivery)}</b>
          </div>
        )}
        {(cargo.updatedBy || cargo.createdBy) && (
          <div className="flex items-center gap-2">
            <Icon name="userCheck" size={14} className="text-ink-mute" />
            Hodim: <b className="font-semibold text-ink">{cargo.updatedBy || cargo.createdBy}</b>
          </div>
        )}
      </dl>

      {cargo.imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
          {cargo.imageUrls.map((u) => (
            <button key={u} onClick={() => setPreview(u)} aria-label="Rasmni kattalashtirish" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="Yuk rasmi" loading="lazy" className="size-16 rounded-xl border border-line object-cover" />
            </button>
          ))}
        </div>
      )}
      <Lightbox src={preview} onClose={() => setPreview(null)} />
    </article>
  );
}
