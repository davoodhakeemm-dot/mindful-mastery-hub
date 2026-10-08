import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useT } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Hypnotism Course" },
      {
        name: "description",
        content: "Enter your email and the class password to reach your Hypnotism course.",
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

const CLASS_PASSWORD = "8867";

function AuthPage() {
  const t = useT();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const submit = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail) {
      toast.error(lang === "ml" ? "ഇമെയിൽ നൽകുക" : "Enter your email");
      return;
    }
    if (password.trim() !== CLASS_PASSWORD) {
      toast.error(lang === "ml" ? "പാസ്‌വേഡ് തെറ്റാണ്" : "Wrong class password");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: mail,
        password: CLASS_PASSWORD,
      });
      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: mail,
          password: CLASS_PASSWORD,
        });
        if (signUpError) throw signUpError;
        const { error: retry } = await supabase.auth.signInWithPassword({
          email: mail,
          password: CLASS_PASSWORD,
        });
        if (retry) throw retry;
      }
    } catch {
      toast.error(lang === "ml" ? "ലോഗിൻ പരാജയപ്പെട്ടു" : "Sign-in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center hero-surface px-5">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm rounded-3xl surface-card p-8 text-center animate-rise">
        <Logo size={64} className="mx-auto" />
        <h1 className="mt-4 font-display text-2xl text-gold">{t("login")}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("privacyNotice")}</p>

        <div className="mt-6 space-y-3 text-left">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("gmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder={t("classPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </div>

        <Button className="mt-6 w-full" size="lg" onClick={() => void submit()} disabled={busy}>
          {t("continueText")}
        </Button>

        <Link to="/" className="mt-6 block text-xs text-muted-foreground underline">
          ← {t("brandTitle")}
        </Link>
      </div>
    </div>
  );
}
