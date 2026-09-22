import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n";
import { useProfile, useSession } from "@/lib/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const t = useT();
  const { lang } = useLanguage();
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile(user?.id);

  const approved = profile?.status === "approved";


  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-2xl text-foreground">
          {t("welcome")}
          {profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">…</p>}

        {!isLoading && !profile && (
          <div className="mt-6 rounded-3xl surface-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("registerTitle")}</p>
            <Button asChild className="mt-4">
              <Link to="/register">{t("joinClass")}</Link>
            </Button>
          </div>
        )}

        {profile?.status === "pending" && (
          <p className="mt-6 rounded-2xl border border-border bg-secondary/50 p-4 text-sm text-foreground/90">
            {t("pendingApproval")}
          </p>
        )}
        {(profile?.status === "suspended" || profile?.status === "removed") && (
          <p className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground/90">
            {t("suspended")}
          </p>
        )}

        {approved && (
          <section className="mt-6">
            <div className="rounded-3xl surface-card p-6 text-center">
              <h2 className="font-display text-xl text-foreground">{t("myClasses")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === "ml"
                  ? "നിങ്ങളുടെ രജിസ്ട്രേഷൻ അനുമതി ലഭിച്ചു. ക്ലാസ് തുടങ്ങാം."
                  : "Your registration is approved. You can begin the class."}
              </p>
              <Button asChild className="mt-5" size="lg">
                <a
                  href="https://drive.google.com/drive/folders/1BcEl0WYmikGLQqPPhvd0LvWpSDOnwowl"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("startLearning")}
                </a>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
