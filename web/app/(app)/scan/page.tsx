"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { beep } from "@/lib/feedback";
import { compressImage } from "@/lib/image";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/PageHeader";
import dynamic from "next/dynamic";

// Kamera kutubxonasi (zxing) faqat kerak bo'lganda yuklanadi
const Scanner = dynamic(() => import("@/components/Scanner").then((m) => m.Scanner), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />,
});
import { Sheet } from "@/components/Sheet";
import { ClientList } from "@/components/ClientList";
import { NewClientSheet } from "@/components/NewClientSheet";
import { Icon } from "@/components/icons";
import { Button, IconButton, TextInput } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";

const MAX_PHOTOS = 4;
interface Photo {
  blob: Blob;
  url: string;
}

export default function ScanPage() {
  return (
    <Guard perm="scan">
      <ScanInner />
    </Guard>
  );
}

function ScanInner() {
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();

  const [code, setCode] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [picker, setPicker] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  // Rasm ob'ekt manzillarini sahifadan chiqqanda bo'shatamiz
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const confirmCode = (value: string) => {
    setCode(value.trim());
    beep();
  };

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (photosRef.current.length >= MAX_PHOTOS) {
        toast(`Ko'pi bilan ${MAX_PHOTOS} ta rasm`, "warn");
        break;
      }
      const blob = await compressImage(f);
      setPhotos((l) => [...l, { blob, url: URL.createObjectURL(blob) }]);
    }
    if (camRef.current) camRef.current.value = "";
    if (galRef.current) galRef.current.value = "";
  }

  const removePhoto = (i: number) =>
    setPhotos((l) => {
      URL.revokeObjectURL(l[i].url);
      return l.filter((_, k) => k !== i);
    });

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setCode(null);
    setClientId("");
    setPhotos([]);
  }

  async function save() {
    if (!code) return;
    const sender = clientId.trim().toUpperCase();
    if (!sender) return toast("Mijoz ID sini kiriting yoki tanlang", "warn");
    setSaving(true);
    try {
      // Mavjud yukni (masalan yo'ldagini) tasodifan qayta "omborda" qilib yubormaslik uchun tekshiramiz
      const all = await qc.fetchQuery({ queryKey: ["cargos"], queryFn: api.cargos, staleTime: 0 });
      const dup = all.find((c) => c.barcode.toLowerCase() === code.toLowerCase());
      if (dup) {
        beep(false);
        toast(`Bu pochta kodi allaqachon kiritilgan (${dup.status === "omborda" ? "omborda" : "boshqa holatda"})`, "err");
        return;
      }
      await api.saveCargo({ barcode: code, senderId: sender, status: "omborda", images: photos.map((p) => p.blob) });
      qc.invalidateQueries({ queryKey: ["cargos"] });
      toast("Yuk muvaffaqiyatli saqlandi ✓", "ok");
      reset();
    } catch (e) {
      beep(false);
      toast(e instanceof Error ? e.message : "Xatolik", "err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Skaner" subtitle={code ? "Yuk ma'lumotlarini kiriting" : "Shtrix kodni skanerlang"} />

      {!code ? (
        <div className="space-y-3 p-3">
          <Scanner
            active={!manual}
            onDetect={confirmCode}
            className="h-[min(58dvh,30rem)] rounded-3xl"
          />
          <Button full variant="secondary" icon="keyboard" onClick={() => setManual(true)}>
            Qo&apos;lda kiritish
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <div className="card flex items-center gap-3 border-brand/30 bg-brand-bg p-3.5">
            <span className="flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-[10px] font-extrabold tracking-wider text-white">
              <Icon name="tick" size={12} /> TASDIQLANDI
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-base font-bold">{code}</span>
            <IconButton icon="edit" label="Kodni o'zgartirish" onClick={() => { setManualValue(code); setManual(true); }} />
            <IconButton icon="x" label="Qaytadan skanerlash" onClick={reset} />
          </div>

          <div className="card space-y-4 p-4">
            <TextInput
              label="Mijoz ID"
              icon="user"
              placeholder="Masalan: YK70101"
              autoCapitalize="characters"
              autoCorrect="off"
              value={clientId}
              onChange={(e) => setClientId(e.target.value.toUpperCase())}
              right={<IconButton type="button" icon="users" label="Mijozlar ro'yxatidan tanlash" className="text-brand" onClick={() => setPicker(true)} />}
            />

            <div>
              <p className="mb-1.5 text-sm font-semibold">
                Yuk rasmlari <span className="font-normal text-ink-soft">({photos.length}/{MAX_PHOTOS})</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Rasm ${i + 1}`} className="size-full rounded-xl border border-line object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      aria-label="Rasmni o'chirish"
                      className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Button variant="soft" icon="camera" disabled={photos.length >= MAX_PHOTOS} onClick={() => camRef.current?.click()}>
                  Rasmga olish
                </Button>
                <Button variant="secondary" disabled={photos.length >= MAX_PHOTOS} onClick={() => galRef.current?.click()}>
                  Galereya
                </Button>
              </div>
              <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhotos(e.target.files)} />
              <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
            </div>
          </div>

          <div className="sticky bottom-[calc(4.6rem+var(--safe-bottom))] z-20">
            <Button full loading={saving} icon="tick" onClick={save}>
              Saqlash
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={manual}
        onClose={() => setManual(false)}
        title="Shtrix kodni qo'lda kiritish"
        footer={
          <Button
            full
            disabled={!manualValue.trim()}
            onClick={() => {
              confirmCode(manualValue);
              setManual(false);
              setManualValue("");
            }}
          >
            Tasdiqlash
          </Button>
        }
      >
        <TextInput
          autoFocus
          label="Pochta (shtrix) kodi"
          autoCapitalize="characters"
          autoCorrect="off"
          inputMode="text"
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && manualValue.trim()) {
              confirmCode(manualValue);
              setManual(false);
              setManualValue("");
            }
          }}
        />
      </Sheet>

      <Sheet
        open={picker}
        onClose={() => setPicker(false)}
        title="Mijozni tanlang"
        footer={
          can("clients") && (
            <Button full variant="soft" icon="plus" onClick={() => setNewClient(true)}>
              Yangi mijoz
            </Button>
          )
        }
      >
        <div className="-mx-5">
          <ClientList
            onPick={(c) => {
              setClientId(c.id);
              setPicker(false);
            }}
          />
        </div>
      </Sheet>
      <NewClientSheet
        open={newClient}
        onClose={() => setNewClient(false)}
        onCreated={(c) => {
          setClientId(c.id);
          setPicker(false);
        }}
      />
    </>
  );
}
