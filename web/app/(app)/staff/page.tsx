"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PERMS, type PermKey, type StaffUser } from "@/lib/types";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { Icon } from "@/components/icons";
import { Badge, Button, Checkbox, Empty, ErrorBox, PasswordInput, Spinner, Switch, TextInput } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function StaffPage() {
  return (
    <Guard admin>
      <Inner />
    </Guard>
  );
}

function Inner() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["staff"], queryFn: api.staff });
  const [sheet, setSheet] = useState<{ open: boolean; user?: StaffUser }>({ open: false });
  const [pending, setPending] = useState<number | null>(null);

  const update = useMutation({
    mutationFn: ({ id, ...d }: { id: number; permissions?: string[]; active?: boolean }) => api.updateStaff(id, d),
    onMutate: ({ id }) => setPending(id),
    onSettled: () => {
      setPending(null);
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Xatolik", "err"),
  });

  const members = (data || []).filter((u) => u.role !== "admin");

  return (
    <>
      <PageHeader
        title="Hodimlar"
        subtitle={`Jami: ${members.length} ta hodim`}
        back
        actions={
          <Button small icon="plus" onClick={() => setSheet({ open: true })}>
            Yangi
          </Button>
        }
      />
      {isLoading && (
        <div className="flex justify-center py-16 text-brand">
          <Spinner className="size-8" />
        </div>
      )}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && members.length === 0 && <Empty icon="users" text={'Hodimlar yo\'q. "Yangi" tugmasi bilan qo\'shing.'} />}

      <ul className="space-y-3 p-3">
        {members.map((u) => (
          <li key={u.id} className="card p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-ink-soft">
                <Icon name="user" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate font-bold">{u.fullName}</span>
                  <Badge color={u.active ? "green" : "slate"}>{u.active ? "Faol" : "Nofaol"}</Badge>
                </p>
                <p className="text-[13px] text-ink-soft">Login: {u.login}</p>
              </div>
            </div>

            <div className="mt-3 divide-y divide-line rounded-xl border border-line">
              {(Object.keys(PERMS) as PermKey[]).map((k) => (
                <div key={k} className="flex min-h-12 items-center justify-between px-3">
                  <span className="text-sm font-semibold">{PERMS[k]}</span>
                  <Switch
                    label={`${PERMS[k]} ruxsati`}
                    checked={u.permissions.includes(k)}
                    disabled={!u.active || pending === u.id}
                    onChange={(on) =>
                      update.mutate({
                        id: u.id,
                        permissions: on ? [...u.permissions, k] : u.permissions.filter((p) => p !== k),
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" small icon="edit" onClick={() => setSheet({ open: true, user: u })}>
                Tahrir
              </Button>
              <Button
                variant="secondary"
                small
                icon={u.active ? "lock" : "tick"}
                className={u.active ? "text-red-500" : "text-emerald-600"}
                disabled={pending === u.id}
                onClick={() => update.mutate({ id: u.id, active: !u.active })}
              >
                {u.active ? "Nofaollashtirish" : "Faollashtirish"}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <StaffSheet key={sheet.user?.id ?? "new"} {...sheet} onClose={() => setSheet({ open: false })} />
    </>
  );
}

/** Yangi hodim qo'shish yoki mavjudining ismi/parolini o'zgartirish. Ruxsatlar majburiy emas. */
function StaffSheet({ open, user, onClose }: { open: boolean; user?: StaffUser; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const edit = !!user;
  const [name, setName] = useState(user?.fullName ?? "");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (edit) await api.updateStaff(user.id, { fullName: name, password: password || undefined });
      else await api.createStaff({ login: login.trim(), fullName: name, password, permissions: [...perms] });
      await qc.invalidateQueries({ queryKey: ["staff"] });
      toast(edit ? "Saqlandi ✓" : "Hodim qo'shildi ✓", "ok");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    }
    setBusy(false);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={edit ? "Hodimni tahrirlash" : "Yangi hodim"}
      footer={
        <Button full loading={busy} onClick={save}>
          Saqlash
        </Button>
      }
    >
      <div className="space-y-3.5">
        <TextInput label="Ism familya" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="words" />
        {!edit && (
          <TextInput
            label="Login"
            hint="Lotin harf, raqam (kamida 3 belgi)"
            autoCapitalize="none"
            autoCorrect="off"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        )}
        <PasswordInput
          label={edit ? "Yangi parol (ixtiyoriy)" : "Parol"}
          hint="Kamida 6 belgi"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!edit && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Ruxsatlar (ixtiyoriy)</legend>
            <div className="divide-y divide-line rounded-xl border border-line">
              {(Object.keys(PERMS) as PermKey[]).map((k) => (
                <label key={k} className="flex min-h-12 cursor-pointer items-center justify-between px-3">
                  <span className="text-sm font-semibold">{PERMS[k]}</span>
                  <Checkbox
                    label={PERMS[k]}
                    checked={perms.has(k)}
                    onChange={(on) =>
                      setPerms((p) => {
                        const n = new Set(p);
                        on ? n.add(k) : n.delete(k);
                        return n;
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
