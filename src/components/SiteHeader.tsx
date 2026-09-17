import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useIsAdmin, useSession } from "@/lib/useAuth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader({ onLogoTripleTap }: { onLogoTripleTap?: () => void }) {
  const t = useT();
  const { user } = useSession();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={34} onTripleTap={onLogoTripleTap} />
          <span className="font-display text-lg leading-none tracking-wide text-gold">
            HYPNOTISM
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button asChild variant="secondary" size="sm">
                <Link to="/dashboard">{t("myClasses")}</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={signOut}>
                {t("logout")}
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">{t("login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
