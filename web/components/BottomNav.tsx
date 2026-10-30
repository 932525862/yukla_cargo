"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { PermKey } from "@/lib/types";
import { Icon, type IconName } from "./icons";
import { cn } from "./ui";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  perm?: PermKey;
  match?: string[];
}

export function BottomNav() {
  const path = usePathname();
  const { can, isAdmin } = useAuth();

  const tabs: Tab[] = [
    {
      href: "/home",
      label: isAdmin ? "Admin" : "Kabinet",
      icon: isAdmin ? "shield" : "user",
      match: ["/home", "/clients", "/staff", "/bot"],
    },
    { href: "/scan", label: "Skaner", icon: "scan", perm: "scan" },
    { href: "/ombor", label: "Ombor", icon: "inbox", perm: "ombor" },
    { href: "/yolda", label: "Yo'lda", icon: "truck", perm: "yolda" },
    { href: "/topshirish", label: "Topshirish", icon: "check", perm: "topshirish" },
  ];

  return (
    <nav
      aria-label="Asosiy menyu"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[var(--safe-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-3xl">
        {tabs
          .filter((t) => !t.perm || can(t.perm))
          .map((t) => {
            const active = (t.match || [t.href]).some((m) => path === m || path.startsWith(m + "/"));
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors",
                    active ? "text-brand" : "text-ink-mute active:text-ink-soft",
                  )}
                >
                  <span className={cn("flex h-7 w-14 items-center justify-center rounded-full transition-colors", active && "bg-brand-bg")}>
                    <Icon name={t.icon} size={21} />
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
