"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? "/home" : "/login");
  }, [user, loading, router]);
  return (
    <div className="flex min-h-dvh items-center justify-center text-brand">
      <Spinner className="size-8" />
    </div>
  );
}
