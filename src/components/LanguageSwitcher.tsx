import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-secondary/60 p-1 text-xs",
        className,
      )}
    >
      {(["en", "ml"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            lang === l
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground",
          )}
        >
          {l === "en" ? "English" : "മലയാളം"}
        </button>
      ))}
    </div>
  );
}
