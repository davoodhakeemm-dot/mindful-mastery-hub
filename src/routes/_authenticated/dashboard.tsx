import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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

  const { data: courses } = useQuery({
    queryKey: ["my-courses", user?.id],
    enabled: !!user && approved,
    queryFn: async () => {
      const { data: access, error } = await supabase
        .from("course_access")
        .select("course_id")
        .eq("revoked", false);
      if (error) throw error;
      const ids = (access ?? []).map((a) => a.course_id);
      if (ids.length === 0) return [];
      const { data, error: cErr } = await supabase
        .from("courses")
        .select("id, slug, title_en, title_ml, description_en, description_ml")
        .in("id", ids);
      if (cErr) throw cErr;
      return data ?? [];
    },
  });

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
            <h2 className="font-display text-xl text-foreground">{t("myClasses")}</h2>
            {courses && courses.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">{t("noAccess")}</p>
            )}
            <div className="mt-4 grid gap-3">
              {courses?.map((c) => (
                <div key={c.id} className="rounded-3xl surface-card p-5">
                  <h3 className="font-display text-lg text-gold">
                    {lang === "ml" ? c.title_ml : c.title_en}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(lang === "ml" ? c.description_ml : c.description_en) ?? ""}
                  </p>
                  <Button asChild className="mt-4" size="sm">
                    <Link to="/course/$courseId" params={{ courseId: c.id }}>
                      {t("continueLearning")}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
