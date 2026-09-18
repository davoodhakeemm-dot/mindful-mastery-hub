import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Brain, Eye, HeartHandshake, MessageCircle, Scale, Sparkles, Waves } from "lucide-react";

import hero from "@/assets/hero.jpg";
import { Logo } from "@/components/Logo";
import { SiteHeader } from "@/components/SiteHeader";
import { LanguageGate } from "@/components/LanguageGate";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hypnotism Course — ഹിപ്നോട്ടിസം | Private Bilingual Class" },
      {
        name: "description",
        content:
          "A private bilingual (Malayalam & English) course on hypnotism: focus, relaxation, suggestion, communication, observation, history, ethics and scientific perspectives.",
      },
      { property: "og:title", content: "Hypnotism Course — ഹിപ്നോട്ടിസം" },
      {
        property: "og:description",
        content:
          "Learn hypnotism responsibly in Malayalam and English — focus, relaxation, suggestion, ethics and science.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const topics = [
  {
    icon: Brain,
    en: "Understanding the mind & attention",
    ml: "മനസ്സും ശ്രദ്ധയും മനസ്സിലാക്കൽ",
  },
  { icon: Waves, en: "Relaxation & concentration practice", ml: "വിശ്രമവും ഏകാഗ്രതയും" },
  { icon: Sparkles, en: "Suggestion & imagination", ml: "നിർദ്ദേശവും സങ്കൽപ്പശക്തിയും" },
  { icon: MessageCircle, en: "Communication skills", ml: "ആശയവിനിമയ കഴിവുകൾ" },
  { icon: Eye, en: "Observation & rapport", ml: "നിരീക്ഷണവും ബന്ധം സ്ഥാപിക്കലും" },
  { icon: Scale, en: "History, ethics & safety", ml: "ചരിത്രം, ധാർമ്മികത, സുരക്ഷ" },
];

function Index() {
  const t = useT();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <LanguageGate />
      <SiteHeader onLogoTripleTap={() => navigate({ to: "/admin-access" })} />

      <section className="relative overflow-hidden hero-surface">
        <img
          src={hero}
          alt="Calm spiral of light representing focused attention"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-5xl px-5 py-16 text-center">
          <Logo size={92} className="mx-auto animate-slow-spin" />
          <h1 className="mt-6 font-display text-4xl leading-tight text-gold sm:text-5xl">
            {t("brandTitle")}
          </h1>
          <p className="mt-1 font-display text-xl text-foreground/90">ഹിപ്നോട്ടിസം</p>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("tagline")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/register">{t("joinClass")}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link to="/auth">{t("login")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl space-y-10 px-5 py-12">
        <section className="rounded-3xl surface-card p-6">
          <h2 className="font-display text-2xl text-foreground">{t("introTitle")}</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {t("introBody")
              .split("\n\n")
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
          <p className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4 text-xs leading-relaxed text-foreground/80">
            {lang === "ml"
              ? "ഈ കോഴ്സ് വിദ്യാഭ്യാസ ആവശ്യത്തിന് മാത്രമാണ്. ഇത് വൈദ്യശാസ്ത്ര ചികിത്സയോ ക്ലിനിക്കൽ ഹിപ്നോതെറാപ്പിയോ അല്ല. ചികിത്സാ ആവശ്യങ്ങൾക്ക് യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധരെ സമീപിക്കുക."
              : "This course is educational only. It is not medical treatment or clinical hypnotherapy. For health concerns, consult a qualified professional. Nothing here is supernatural mind control."}
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">{t("learnTitle")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {topics.map(({ icon: Icon, en, ml }) => (
              <div key={en} className="flex items-start gap-3 rounded-2xl surface-card p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="text-sm text-foreground/90">{lang === "ml" ? ml : en}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl surface-card p-6 text-center">
          <HeartHandshake className="mx-auto size-7 text-primary" />
          <h2 className="mt-3 font-display text-2xl text-foreground">{t("ethicsTitle")}</h2>
          <p className="mt-2 text-sm text-primary">{t("ethicsPillars")}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {lang === "ml"
              ? "മറ്റൊരാളുടെ സമ്മതമില്ലാതെ ഒരു പരിശീലനവും ചെയ്യരുത്. ആരെയും ഭയപ്പെടുത്തുന്നതോ ഉപദ്രവിക്കുന്നതോ ആയ പ്രകടനങ്ങൾ ഈ കോഴ്സ് അനുവദിക്കുന്നില്ല."
              : "Never practise on anyone without clear consent. Stage-style stunts, coercion, or claims of controlling another person are outside this course."}
          </p>
        </section>

        <section className="rounded-3xl border border-border p-6 text-center">
          <h2 className="font-display text-xl text-foreground">{t("categories")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "ml"
              ? "മലയാളം ക്ലാസ്, ഇംഗ്ലീഷ് ക്ലാസ് — രജിസ്ട്രേഷന് ശേഷം അനുമതി ലഭിക്കുന്ന ക്ലാസുകൾ കാണാം."
              : "Malayalam class and English class — approved students see their class after registration."}
          </p>
          <Button asChild className="mt-5">
            <Link to="/register">{t("joinClass")}</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        <p>{t("privacyNotice")}</p>
        <p className="mt-2">© {new Date().getFullYear()} Hypnotism Course</p>
      </footer>
    </div>
  );
}
