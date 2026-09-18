import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Hypnotism Course" },
      {
        name: "description",
        content:
          "Sign in with your email and password to access your private Hypnotism course.",
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Login successful!");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please check your email and password.";

      toast.error(message);
    } finally {
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

        <h1 className="mt-4 font-display text-2xl text-gold">
          {t("login")}
        </h1>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Sign in with your registered email and password to access your
          private Hypnotism course.
        </p>

        <div className="mt-7 space-y-4 text-left">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email
            </label>

            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              autoComplete="email"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  signIn();
                }
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>

            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  signIn();
                }
              }}
            />
          </div>
        </div>

        <Button
          className="mt-7 w-full"
          size="lg"
          onClick={signIn}
          disabled={busy}
        >
          {busy ? "Signing in..." : "Sign In"}
        </Button>

        <Link
          to="/"
          className="mt-6 block text-xs text-muted-foreground underline"
        >
          ← {t("brandTitle")}
        </Link>
      </div>
    </div>
  );
}
