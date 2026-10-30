"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, PasswordInput, TextInput } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [user, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginName.trim() || !password) return setError("Login va parolni kiriting");
    setBusy(true);
    setError("");
    try {
      await login(loginName.trim(), password);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Yukla Cargo" className="mx-auto mb-3 h-24 w-auto object-contain" />
        <h1 className="text-2xl font-extrabold">Yukla Cargo</h1>
        <p className="mt-1 text-sm text-ink-soft">Tizimga kirish</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <TextInput
          label="Login"
          icon="user"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
        />
        <PasswordInput
          label="Parol"
          icon="lock"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" full loading={busy}>
          Kirish
        </Button>
      </form>
    </main>
  );
}
