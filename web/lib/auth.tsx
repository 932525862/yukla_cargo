"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { PermKey, StaffUser } from "./types";

interface AuthState {
  user: StaffUser | null;
  /** Sessiya tekshirilmoqda (sahifa birinchi ochilganda) */
  loading: boolean;
  isAdmin: boolean;
  can: (perm: PermKey) => boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const clear = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    // Ruxsatlar o'zgargan bo'lishi mumkin — har safar serverdan yangilab olamiz
    api.me().then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, [clear]);

  // Boshqa hodim ruxsatini o'zgartirsa, hodim ilovaga qaytganda yangilanadi
  useEffect(() => {
    const onFocus = () => tokenStore.get() && api.me().then(setUser).catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      can: (perm) => !!user && (user.role === "admin" || user.permissions.includes(perm)),
      login: async (login, password) => {
        const r = await api.login(login, password);
        tokenStore.set(r.token);
        setUser(r.user);
      },
      logout: async () => {
        await api.logout().catch(() => {});
        clear();
      },
    }),
    [user, loading, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth AuthProvider ichida ishlatilishi kerak");
  return v;
};
