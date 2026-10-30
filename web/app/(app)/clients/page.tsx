"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Guard } from "@/components/Guard";
import { PageHeader } from "@/components/PageHeader";
import { ClientList } from "@/components/ClientList";
import { NewClientSheet } from "@/components/NewClientSheet";
import { Button } from "@/components/ui";

export default function ClientsPage() {
  return (
    <Guard perm="clients">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title="Mijoz IDlari"
        subtitle={user?.fullName}
        back
        actions={
          <Button small icon="plus" onClick={() => setOpen(true)}>
            Yangi
          </Button>
        }
      />
      <ClientList />
      <NewClientSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
