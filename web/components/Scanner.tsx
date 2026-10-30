"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Icon } from "./icons";
import { setSoundEnabled, soundEnabled } from "@/lib/feedback";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "Yukla Cargo";
const LOGO = "/logo.png"; // public/logo.png — fayl bo'lmasa ikonka ko'rsatiladi

const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

function explain(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (!window.isSecureContext)
    return "Kamera faqat HTTPS (yoki localhost) orqali ishlaydi. Hozircha kodni qo'lda kiriting.";
  if (name === "NotAllowedError") return "Kameraga ruxsat berilmagan. Brauzer manzil qatoridagi kamera belgisidan ruxsat bering.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Kamera topilmadi. Kodni qo'lda kiriting.";
  if (name === "NotReadableError") return "Kamera boshqa dastur tomonidan band. Uni yoping va qayta urinib ko'ring.";
  return "Kamerani ochib bo'lmadi. Kodni qo'lda kiriting.";
}

type TorchTrack = MediaStreamTrack;

/** Brauzer kamerasi bilan shtrix/QR kod o'qiydi. `active=false` bo'lsa kamera o'chadi. */
export function Scanner({ onDetect, active = true, className = "" }: { onDetect: (code: string) => void; active?: boolean; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<TorchTrack | null>(null);
  const cb = useRef(onDetect);
  cb.current = onDetect;
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torch, setTorch] = useState<boolean | null>(null); // null — qo'llab-quvvatlanmaydi
  const [attempt, setAttempt] = useState(0);
  const [sound, setSound] = useState(true);
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => setSound(soundEnabled()), []);

  useEffect(() => {
    const el = video.current;
    if (!active || !el) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setError("");
    setReady(false);
    setTorch(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(explain(null));
      return;
    }

    // Oqimni o'zimiz boshqaramiz: React StrictMode'da effekt ikki marta ishlaganda
    // eski o'quvchi yangi oqimni uzib qo'ymasligi uchun har bir oqim faqat o'z effektiga tegishli.
    (async () => {
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch (e) {
          if ((e as { name?: string }).name !== "OverconstrainedError") throw e;
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());

        el.srcObject = stream;
        await el.play();
        if (cancelled) return;

        const t = stream.getVideoTracks()[0] as TorchTrack;
        track.current = t;
        setTorch((t.getCapabilities?.() as { torch?: boolean } | undefined)?.torch ? false : null);
        setReady(true);

        const reader = new BrowserMultiFormatReader(HINTS as Map<DecodeHintType, never>);
        const tick = () => {
          if (cancelled) return;
          if (el.readyState >= 2 && el.videoWidth > 0) {
            try {
              const text = reader.decode(el).getText();
              if (text) cb.current(text);
            } catch {
              // kod kadrda yo'q — keyingi urinish
            }
          }
          timer = setTimeout(tick, 120);
        };
        tick();
      } catch (e) {
        if (!cancelled) setError(explain(e));
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      track.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      el.srcObject = null;
    };
  }, [active, facing, attempt]);

  const toggleTorch = useCallback(async () => {
    const t = track.current;
    if (!t || torch === null) return;
    try {
      await t.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorch(null);
    }
  }, [torch]);

  return (
    <div className={`relative isolate overflow-hidden bg-slate-950 ${className}`}>
      <video
        ref={video}
        muted
        playsInline
        autoPlay
        className={`size-full object-cover transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"} ${facing === "user" ? "-scale-x-100" : ""}`}
      />

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-200">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/10">
            <Icon name="camera" size={28} className="text-slate-300" />
          </span>
          <p className="max-w-[18rem] leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="min-h-10 rounded-full bg-white/15 px-5 text-sm font-semibold text-white active:bg-white/25"
          >
            Qayta urinish
          </button>
        </div>
      ) : (
        <>
          {/* Ramka tashqarisi xiralashadi, ichi aniq ko'rinadi */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[58%] w-[80%] max-w-xs rounded-2xl shadow-[0_0_0_999px_rgba(2,6,23,.55)]">
              {(["left-0 top-0 rounded-tl-2xl border-l-4 border-t-4", "right-0 top-0 rounded-tr-2xl border-r-4 border-t-4", "bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4", "bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4"] as const).map((c) => (
                <span key={c} className={`absolute size-7 border-white ${c}`} />
              ))}
              {ready && <span className="absolute inset-x-3 h-0.5 animate-[scan-line_2s_ease-in-out_infinite] rounded bg-brand-light shadow-[0_0_14px_3px_rgba(59,130,246,.8)]" />}
            </div>
          </div>

          <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-2 rounded-full bg-black/45 py-1 pl-1 pr-3 backdrop-blur">
            <span className="flex h-8 w-11 items-center justify-center overflow-hidden rounded-full bg-white px-1">
              {logoOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={LOGO} alt="" className="size-full object-contain" onError={() => setLogoOk(false)} />
              ) : (
                <Icon name="package" size={16} className="text-brand" />
              )}
            </span>
            <span className="text-xs font-extrabold tracking-wide text-white">{COMPANY}</span>
          </div>

          {ready && (
            <div className="absolute right-2.5 top-2.5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setSound(!sound);
                  setSoundEnabled(!sound);
                }}
                aria-label={sound ? "Ovozni o'chirish" : "Ovozni yoqish"}
                aria-pressed={sound}
                className={`flex size-10 items-center justify-center rounded-full text-lg backdrop-blur ${sound ? "bg-black/40 text-white" : "bg-red-500/80 text-white"}`}
              >
                {sound ? "🔊" : "🔇"}
              </button>
              {torch !== null && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  aria-label="Chiroq"
                  aria-pressed={torch}
                  className={`flex size-10 items-center justify-center rounded-full text-lg backdrop-blur ${torch ? "bg-amber-400 text-slate-900" : "bg-black/40 text-white"}`}
                >
                  ⚡
                </button>
              )}
              <button
                type="button"
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                aria-label="Kamerani almashtirish"
                className="flex size-10 items-center justify-center rounded-full bg-black/40 text-lg text-white backdrop-blur"
              >
                ⟳
              </button>
            </div>
          )}

          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
            <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {ready ? "Shtrix kodni ramka ichiga tuting" : "Kamera ochilmoqda…"}
            </span>
          </p>
        </>
      )}
    </div>
  );
}
