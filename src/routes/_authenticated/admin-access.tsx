import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyAdminKey } from "@/lib/admin.functions";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin-access")({
  component: AdminAccess,
});

function AdminAccess() {
  const t = useT();
  const navigate = useNavigate();
  const verify = useServerFn(verifyAdminKey);
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await verify({ data: { key } });
      if (res.lockedOut) {
        toast.error("Too many attempts. Try again later.");
        return;
      }
      if (!res.ok || !res.isAdmin) {
        toast.error("Access denied");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      navigate({ to: "/admin", replace: true });
    } catch {
      toast.error("Access denied");
    } finally {
      setKey("");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-surface px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl surface-card p-8 text-center">
        <Logo size={56} className="mx-auto" />
        <h1 className="mt-4 font-display text-xl text-foreground">{t("adminAccess")}</h1>
        <Input
          className="mt-6 text-center"
          type="password"
          autoFocus
          placeholder={t("enterKey")}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Button type="submit" className="mt-4 w-full" disabled={busy || !key}>
          {t("verify")}
        </Button>
      </form>
    </div>
  );
}
