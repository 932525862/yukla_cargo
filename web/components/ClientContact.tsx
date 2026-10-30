"use client";

import { useClientMap } from "@/lib/hooks";
import { Icon } from "./icons";

/** Mijoz ID bo'yicha ism, telefon (bosilsa qo'ng'iroq) va Telegram (bosilsa ochiladi) */
export function ClientContact({ clientId }: { clientId: string }) {
  const client = useClientMap().get(clientId.toUpperCase());
  if (!client) return null;
  return (
    <div className="mt-2 space-y-1.5 text-[13px]">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="badge" size={15} className="text-ink-mute" />
        {client.firstName} {client.lastName}
      </p>
      <a href={`tel:${client.phone}`} className="flex w-fit items-center gap-2 font-semibold text-brand" onClick={(e) => e.stopPropagation()}>
        <Icon name="phone" size={15} className="text-ink-mute" />
        {client.phone}
      </a>
      {client.telegram && (
        <a
          href={`https://t.me/${client.telegram}`}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-2 font-semibold text-brand"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="send" size={15} className="text-ink-mute" />@{client.telegram}
        </a>
      )}
    </div>
  );
}
