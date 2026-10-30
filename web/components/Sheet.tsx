"use client";

import { useEffect } from "react";
import { IconButton } from "./ui";

/** Telefonda pastdan chiqadigan oyna, katta ekranda markazdagi oyna */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full animate-[sheet-up_.22s_ease-out] flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-center justify-between pl-5 pr-2 pt-2">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <IconButton icon="x" label="Yopish" onClick={onClose} />
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-4 pt-2">{children}</div>
        {footer && <div className="border-t border-line px-5 pb-safe pt-3">{footer}</div>}
      </div>
    </div>
  );
}
