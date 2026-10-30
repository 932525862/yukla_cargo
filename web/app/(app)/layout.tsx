"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-brand">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl bg-canvas pb-[calc(4.5rem+var(--safe-bottom))] shadow-[0_0_0_1px_rgba(226,232,240,.6)]">
      {children}
      <BottomNav />
    </div>
  );
}
