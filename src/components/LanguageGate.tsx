import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n";

export function LanguageGate() {
  const { chosen, setLang } = useLanguage();
  const t = useT();

  if (chosen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center hero-surface px-6">
      <div className="w-full max-w-sm rounded-3xl surface-card p-8 text-center animate-rise">
        <Logo size={72} className="mx-auto animate-slow-spin" />
        <h1 className="mt-5 font-display text-2xl text-gold">HYPNOTISM</h1>
        <p className="mt-1 text-sm text-muted-foreground">ഹിപ്നോട്ടിസം</p>
        <p className="mt-6 text-sm text-foreground">{t("chooseLanguage")}</p>
        <div className="mt-5 grid gap-3">
          <Button onClick={() => setLang("ml")} size="lg">
            മലയാളം
          </Button>
          <Button onClick={() => setLang("en")} size="lg" variant="secondary">
            English
          </Button>
        </div>
      </div>
    </div>
  );
}
