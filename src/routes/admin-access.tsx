import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { HypnoBackdrop } from "@/components/Atmosphere";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/lib/academy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-access")({
  head: () => ({ meta: [{ title: "Admin Access — Hypnotism" }, { name: "robots", content: "noindex" }] }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    try {
      await adminLogin(key.trim());
      toast.success("Welcome back");
      await navigate({ to: "/admin", replace: true });
    } catch (error) {
      setWrong(true);
      window.setTimeout(() => setWrong(false), 650);
      setKey("");
      toast.error(error instanceof Error ? error.message : "Incorrect admin key");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden hero-surface px-5 py-12">
      <div className="grain" />
      <HypnoBackdrop />
      <form
        onSubmit={submit}
        className={cn("relative w-full max-w-sm animate-rise rounded-3xl surface-card p-8 text-center", wrong && "animate-shake")}
      >
        <Logo size={72} className="mx-auto animate-float" />
        <h1 className="mt-6 font-display text-3xl text-shimmer">Admin Space</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your admin key to continue.</p>

        <div className="relative mt-7">
          <KeyRound className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="• • • • •"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="h-12 pl-10 text-center text-lg tracking-[0.5em]"
          />
        </div>

        <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy || !key.trim()}>
          {busy ? "Opening…" : "Unlock"}
        </Button>

        <Link to="/" className="mt-6 block text-xs text-muted-foreground underline-offset-4 hover:underline">
          ← Back to home
        </Link>
      </form>
    </div>
  );
}
