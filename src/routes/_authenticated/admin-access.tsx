import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useSession } from "@/lib/useAuth";
import { verifyAdminKey } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin-access")({
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = key.trim();
    if (!trimmed) {
      toast.error("Enter the admin key");
      return;
    }

    setSubmitting(true);

    try {
      const result = await verifyAdminKey({ data: { key: trimmed } });

      if (result.lockedOut) {
        toast.error("Too many attempts. Try again later.");
        return;
      }

      if (!result.ok || !result.isAdmin) {
        toast.error("Incorrect admin key");
        setKey("");
        return;
      }

      toast.success("Admin access granted");
      await navigate({ to: "/admin", replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Unable to verify admin key");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm rounded-3xl surface-card p-8 text-center">
        <Logo size={64} className="mx-auto" />

        <h1 className="mt-6 font-display text-2xl text-gold">Admin Access</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Enter the admin key to open the Admin Space.
        </p>

        {user ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="Admin key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="text-center tracking-[0.4em]"
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Verifying..." : "Unlock Admin Space"}
            </Button>

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/">Back to home</Link>
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl border border-border bg-secondary/50 p-4 text-xs leading-relaxed text-foreground/80">
              You need to sign in before entering the admin key.
            </p>

            <Button asChild className="w-full">
              <Link to="/auth">Sign in</Link>
            </Button>

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
