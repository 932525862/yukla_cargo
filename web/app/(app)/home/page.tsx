"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCargos } from "@/lib/hooks";
import { PERMS, STATUS_LABEL, type CargoStatus, type PermKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/icons";
import { Sheet } from "@/components/Sheet";
import { Button, Spinner, cn } from "@/components/ui";

const STAT_COLOR: Record<CargoStatus, string> = {
  omborda: "text-brand",
  yolda: "text-accent",
  uzbOmbor: "text-violet",
  topshirildi: "text-ok",
};

function Stats() {
  const { data, isLoading } = useCargos();
  const count = (s: CargoStatus) => (data || []).filter((c) => c.status === s).length;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {(Object.keys(STATUS_LABEL) as CargoStatus[]).map((s) => (
        <div key={s} className="card px-3 py-3.5 text-center">
          <p className={cn("text-2xl font-extrabold", STAT_COLOR[s])}>{isLoading ? <Spinner className="size-5" /> : count(s)}</p>
          <p className="mt-0.5 text-[11px] font-medium text-ink-soft">{STATUS_LABEL[s]}</p>
        </div>
      ))}
    </div>
  );
}

function Tile({ href, onClick, icon, color, title, subtitle }: { href?: string; onClick?: () => void; icon: IconName; color: string; title: string; subtitle: string }) {
  const inner = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}>
        <Icon name={icon} size={22} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-bold">{title}</span>
        <span className="block text-[13px] text-ink-soft">{subtitle}</span>
      </span>
      <Icon name="right" size={18} className="text-ink-mute" />
    </>
  );
  const cls = "card flex w-full items-center gap-3.5 p-4 active:bg-slate-50";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export default function HomePage() {
  const { user, isAdmin, can, logout } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <PageHeader title={isAdmin ? "Admin panel" : "Hodim kabineti"} subtitle={user?.fullName} />
      <main className="space-y-3 p-3">
        <Stats />

        {!isAdmin && (
          <section className="card p-4">
            <h2 className="mb-2.5 text-sm font-bold">Sizga ruxsat berilgan bo&apos;limlar</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PERMS) as PermKey[]).map((k) => (
                <span
                  key={k}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold",
                    can(k) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-ink-mute",
                  )}
                >
                  <Icon name={can(k) ? "tick" : "lock"} size={14} />
                  {PERMS[k]}
                </span>
              ))}
            </div>
          </section>
        )}

        {isAdmin && <Tile href="/staff" icon="users" color="#8B5CF6" title="Hodimlar" subtitle="Hodim qo'shish, ruxsat berish va uzish" />}
        {can("clients") && <Tile href="/clients" icon="badge" color="#10B981" title="Mijozga ID berish" subtitle="Ism, telefon → avtomatik ID (YK70101 ...)" />}
        {isAdmin && <Tile href="/bot" icon="bot" color="#0251FD" title="Telegram bot sozlamalari" subtitle="Bot tokeni, ulanishni tekshirish, test xabar" />}
        <Tile onClick={() => setConfirm(true)} icon="logout" color="#EF4444" title="Chiqish" subtitle="Boshqa hisob bilan kirish uchun" />
      </main>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Tizimdan chiqasizmi?"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Yo&apos;q
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Chiqish
            </Button>
          </div>
        }
      >
        <p className="pb-2 text-sm text-ink-soft">Qayta kirish uchun login va parol kerak bo&apos;ladi.</p>
      </Sheet>
    </>
  );
}
