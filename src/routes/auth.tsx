import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Student Sign In — Hypnotism Course" },
    { name: "description", content: "Sign in to continue your bilingual hypnotism course." },
    { property: "og:title", content: "Student Sign In — Hypnotism Course" },
    { property: "og:description", content: "Sign in to continue your bilingual hypnotism course." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SignInPage,
});

function SignInPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) {
      toast.error(lang === "ml" ? "ലോഗിൻ പരാജയപ്പെട്ടു" : "Sign-in failed. Check your email and password.");
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center hero-surface px-5 py-10">
      <div className="w-full max-w-sm surface-card p-7 text-center">
        <Logo size={64} className="mx-auto" />
        <h1 className="mt-4 font-display text-3xl text-gold">{lang === "ml" ? "വിദ്യാർത്ഥി ലോഗിൻ" : "Student sign in"}</h1>
        <div className="mt-6 grid gap-3">
          <Input type="email" autoComplete="email" placeholder={lang === "ml" ? "ഇമെയിൽ" : "Email"} value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input type="password" autoComplete="current-password" placeholder={lang === "ml" ? "പാസ്‌വേഡ്" : "Password"} value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} />
          <Button onClick={() => void submit()} disabled={busy}>{busy ? "…" : lang === "ml" ? "ലോഗിൻ" : "Sign in"}</Button>
        </div>
        <Link to="/" className="mt-5 inline-block text-sm text-muted-foreground underline">{lang === "ml" ? "ഹോം" : "Home"}</Link>
      </div>
    </main>
  );
}