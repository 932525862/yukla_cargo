"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { cn } from "./ui";

type Kind = "ok" | "err" | "warn" | "info";
interface Item {
  id: number;
  msg: string;
  kind: Kind;
}

const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

const BAR: Record<Kind, string> = { ok: "bg-ok", err: "bg-red-500", warn: "bg-accent", info: "bg-brand" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);

  const push = useCallback((msg: string, kind: Kind = "info") => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-2), { id, msg, kind }]);
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-md animate-[fade-in_.15s_ease-out] items-stretch overflow-hidden rounded-xl bg-ink text-sm font-medium text-white shadow-lg">
            <span className={cn("w-1.5 shrink-0", BAR[t.kind])} />
            <span className="whitespace-pre-line px-3 py-3">{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
