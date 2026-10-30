"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { COUNTRIES, composePhone } from "@/lib/countries";
import { copyText } from "@/lib/feedback";
import type { Client } from "@/lib/types";
import { Sheet } from "./Sheet";
import { Button, Select, TextInput } from "./ui";
import { useToast } from "./Toast";

/** Yangi mijoz yaratish: ism, familya, telefon (davlat kodi bilan), telegram. ID ni server beradi. */
export function NewClientSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (c: Client) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState(COUNTRIES[0].code);
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<(Client & { created: boolean }) | null>(null);

  const reset = () => {
    setFirst("");
    setLast("");
    setPhone("");
    setTelegram("");
    setError("");
    setCreated(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  async function submit() {
    if (!first.trim() || !last.trim()) return setError("Ism va familyani kiriting");
    const full = composePhone(code, phone);
    if (!full) return setError("Telefon raqamni to'liq kiriting");
    setBusy(true);
    setError("");
    try {
      const c = await api.createClient({ firstName: first, lastName: last, phone: full, telegram: telegram.trim() });
      await qc.invalidateQueries({ queryKey: ["clients"] });
      setCreated(c);
      onCreated?.(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
    setBusy(false);
  }

  if (created) {
    return (
      <Sheet open={open} onClose={close} title={created.created ? "Mijoz ID si" : "Mijoz allaqachon mavjud"}>
        <div className="py-4 text-center">
          <p className="text-ink-soft">
            {created.firstName} {created.lastName}
          </p>
          <p className="my-3 select-all text-4xl font-extrabold tracking-wide text-brand">{created.id}</p>
          <p className="text-sm text-ink-soft">{created.phone}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              icon="copy"
              onClick={() => {
                copyText(created.id);
                toast(`${created.id} nusxalandi`, "ok");
              }}
            >
              Nusxalash
            </Button>
            <Button onClick={close}>Tayyor</Button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Yangi mijoz"
      footer={
        <Button full loading={busy} onClick={submit}>
          ID yaratish
        </Button>
      }
    >
      <div className="space-y-3.5">
        <TextInput label="Ism" value={first} onChange={(e) => setFirst(e.target.value)} autoCapitalize="words" autoComplete="off" />
        <TextInput label="Familya" value={last} onChange={(e) => setLast(e.target.value)} autoCapitalize="words" autoComplete="off" />
        <div className="grid grid-cols-[7.5rem_1fr] gap-2">
          <Select label="Kod" value={code} onChange={(e) => setCode(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.name}
              </option>
            ))}
          </Select>
          <TextInput label="Telefon raqam" inputMode="tel" placeholder="90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <TextInput
          label="Telegram username (ixtiyoriy)"
          placeholder="ali_vali"
          autoCapitalize="none"
          autoCorrect="off"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
        />
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
