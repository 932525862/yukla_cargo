"use client";

import { useEffect } from "react";
import { IconButton } from "./ui";

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3" onClick={onClose} role="dialog" aria-label="Rasm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Yuk rasmi" className="max-h-full max-w-full rounded-xl object-contain" />
      <IconButton icon="x" label="Yopish" onClick={onClose} className="absolute right-3 top-[calc(var(--safe-top)+0.75rem)] bg-white/15 text-white" />
    </div>
  );
}
