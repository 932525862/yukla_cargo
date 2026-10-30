"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/icons";
import { Button, Spinner, TextInput, cn } from "@/components/ui";

export default function BotPage() {
  return (
    <Guard admin>
      <Inner />
    </Guard>
  );
}

function Notice({ ok, title, text }: { ok: boolean; title: string; text: string }) {
  return (
    <div className={cn("flex gap-3 rounded-2xl border p-4", ok ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50")}>
      <Icon name={ok ? "check" : "bot"} className={ok ? "text-emerald-600" : "text-accent"} />
      <div>
        <p className={cn("font-bold", ok ? "text-emerald-700" : "text-accent")}>{title}</p>
        <p className="mt-0.5 text-[13px] text-ink-soft">{text}</p>
      </div>
    </div>
  );
}

function Inner() {
  const bot = useQuery({ queryKey: ["bot"], queryFn: api.bot });
  const [chatId, setChatId] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const test = useMutation({
    mutationFn: () => api.botTest(chatId.trim()),
    onSuccess: () => setTestMsg({ ok: true, text: "Test xabar yuborildi ✓" }),
    onError: (e) => setTestMsg({ ok: false, text: e instanceof Error ? e.message : "Xatolik" }),
  });

  const enabled = bot.data?.enabled;

  return (
    <>
      <PageHeader title="Telegram bot sozlamalari" back />
      <main className="space-y-6 p-3">
        {bot.isLoading ? (
          <div className="flex justify-center py-6 text-brand">
            <Spinner className="size-7" />
          </div>
        ) : enabled ? (
          <Notice ok title={`Bot faol: @${bot.data?.username}`} text="Mijozlar botga o'z ID sini yozib yuk holati va rasmini ko'radi; holat o'zgarganda avtomatik xabar oladi." />
        ) : (
          <Notice ok={false} title="Bot ulanmagan" text="Bot tokeni topilmadi. Serverdagi server/.env faylida BOT_TOKEN ni to'ldirib, serverni qayta ishga tushiring." />
        )}

        <section className="card space-y-3 p-4">
          <h2 className="font-bold">Ulanishni tekshirish</h2>
          <p className="-mt-2 text-xs text-ink-soft">Telegram Chat ID ingizga test xabar yuboriladi (ID ni @userinfobot dan bilib oling; avval botga /start yozing)</p>
          <TextInput icon="send" inputMode="numeric" placeholder="Chat ID" value={chatId} onChange={(e) => setChatId(e.target.value)} />
          <Button full variant="secondary" icon="send" loading={test.isPending} disabled={!enabled || !chatId.trim()} onClick={() => test.mutate()}>
            Test xabar yuborish
          </Button>
          {testMsg && (
            <p role="status" className={cn("rounded-xl px-3 py-2.5 text-sm", testMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
              {testMsg.text}
            </p>
          )}
        </section>

      </main>
    </>
  );
}
