"use client";

import { useRouter } from "next/navigation";
import { IconButton } from "./ui";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 pt-[var(--safe-top)] backdrop-blur">
      <div className="flex min-h-14 items-center gap-1 px-3">
        {back && <IconButton icon="back" label="Orqaga" onClick={() => router.back()} />}
        <div className={back ? "min-w-0 flex-1" : "min-w-0 flex-1 pl-2"}>
          <h1 className="truncate text-lg font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
