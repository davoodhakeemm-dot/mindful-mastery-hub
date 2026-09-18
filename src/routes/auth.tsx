import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Hypnotism Course" },
      {
        name: "description",
        content: "Sign in with Google to reach your private Hypnotism course classes.",
      },
      { property: "og:title", content: "Sign in — Hypnotism Course" },
      {
        property: "og:description",
        content: "Private access for registered Hypnotism course students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    setBusy(true);
    try {
      // Use Supabase's native Google OAuth. The Lovable OAuth broker
      // (/~oauth/initiate) only works on Lovable-hosted preview zones and
      // returns 403 anywhere else, so we go straight through Supabase.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch {
      toast.error("Sign-in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center hero-surface px-5">
      <div className="w-full max-w-sm rounded-3xl surface-card p-8 text-center animate-rise">
        <Logo size={64} className="mx-auto" />
        <h1 className="mt-4 font-display text-2xl text-gold">{t("login")}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("privacyNotice")}</p>
        <Button className="mt-7 w-full" size="lg" onClick={signIn} disabled={busy}>
          {t("signInGoogle")}
        </Button>
        <Link to="/" className="mt-6 block text-xs text-muted-foreground underline">
          ← {t("brandTitle")}
        </Link>
      </div>
    </div>
  );
}
