import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, Lock, Play, Sparkles, X } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { Burst, HypnoBackdrop, Reveal, useNow } from "@/components/Atmosphere";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { fetchMyClasses, formatCountdown, studentAction, type StudentClass } from "@/lib/academy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const t = useT();
  const { lang } = useLanguage();
  const { user } = useSession();
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-classes", user?.id],
    enabled: !!user,
    queryFn: fetchMyClasses,
    refetchInterval: 60_000,
  });

  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (data?.registered) setOffset(data.serverNow - Date.now());
  }, [data]);
  const now = useNow(offset);

  // When a countdown finishes, refresh so the class opens without a reload.
  const classes = data?.registered ? data.classes : [];
  const nextUnlock = classes.find((c) => c.state === "countdown")?.unlockAt;
  useEffect(() => {
    if (nextUnlock && now >= nextUnlock) void refetch();
  }, [now, nextUnlock, refetch]);

  const done = classes.filter((c) => c.state === "done").length;
  const active = classes.find((c) => c.id === openId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="grain" />
      <SiteHeader />

      <section className="relative overflow-hidden hero-surface">
        <HypnoBackdrop rings={3} />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-14">
          <p className="animate-rise text-xs uppercase tracking-[0.35em] text-primary/80">{t("myClasses")}</p>
          <h1 className="mt-3 animate-rise font-display text-4xl leading-tight sm:text-5xl" style={{ animationDelay: "80ms" }}>
            <span className="text-foreground/90">{t("welcome")}</span>
            {data?.registered && data.fullName ? <span className="text-shimmer">, {data.fullName}</span> : null}
          </h1>

          {data?.registered && data.status === "approved" && classes.length > 0 && (
            <div className="mt-8 max-w-md animate-rise" style={{ animationDelay: "160ms" }}>
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span>{t("progress")}</span>
                <span className="font-display text-lg text-gold">
                  {done}/{classes.length}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-1000"
                  style={{ width: `${(done / classes.length) * 100}%`, background: "var(--gradient-gold)" }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-secondary/50" />
            ))}
          </div>
        )}

        {data && !data.registered && (
          <Notice>
            <p className="text-sm text-muted-foreground">{t("registerTitle")}</p>
            <Button asChild className="mt-5">
              <Link to="/register">{t("joinClass")}</Link>
            </Button>
          </Notice>
        )}

        {data?.registered && data.status === "pending" && (
          <Notice>
            <Clock className="mx-auto size-8 animate-float text-primary" />
            <p className="mt-4 text-sm text-foreground/90">{t("pendingApproval")}</p>
          </Notice>
        )}

        {data?.registered && (data.status === "suspended" || data.status === "removed") && (
          <Notice tone="danger">
            <p className="text-sm text-foreground/90">{t("suspended")}</p>
          </Notice>
        )}

        {data?.registered && data.status === "approved" && classes.length === 0 && (
          <Notice>
            <Sparkles className="mx-auto size-8 animate-float text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              {lang === "ml" ? "ക്ലാസുകൾ ഉടൻ ലഭ്യമാകും." : "Your classes will appear here soon."}
            </p>
          </Notice>
        )}

        {data?.registered && data.status === "approved" && classes.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c, i) => (
              <Reveal key={c.id} delay={i * 90}>
                <ClassCard item={c} now={now} onOpen={() => setOpenId(c.id)} />
              </Reveal>
            ))}
          </div>
        )}
      </main>

      {active && <ClassViewer item={active} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone?: "danger" }) {
  return (
    <div
      className={cn(
        "mx-auto max-w-md animate-rise rounded-3xl p-8 text-center",
        tone === "danger" ? "border border-destructive/40 bg-destructive/10" : "surface-card",
      )}
    >
      {children}
    </div>
  );
}

function ClassCard({ item, now, onOpen }: { item: StudentClass; now: number; onOpen: () => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const [shake, setShake] = useState(false);
  const available = item.state === "open" || item.state === "done";

  const click = () => {
    if (available) return onOpen();
    setShake(true);
    window.setTimeout(() => setShake(false), 650);
    toast(
      item.state === "countdown"
        ? lang === "ml"
          ? "ഈ ക്ലാസ് ഉടൻ തുറക്കും"
          : "This class opens when the countdown ends"
        : lang === "ml"
          ? "മുൻ ക്ലാസ് പൂർത്തിയാക്കുക"
          : "Finish the previous class first",
    );
  };

  return (
    <button
      onClick={click}
      className={cn(
        "group relative block aspect-[3/4] w-full overflow-hidden rounded-3xl border border-border text-left surface-card",
        available && "card-lift",
      )}
    >
      {item.posterUrl ? (
        <img
          src={item.posterUrl}
          alt=""
          draggable={false}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition duration-700 no-select",
            available ? "group-hover:scale-105" : "scale-105 blur-[2px] brightness-50 saturate-50",
          )}
        />
      ) : (
        <div className="absolute inset-0 hero-surface" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      <div className="absolute left-4 top-4 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary backdrop-blur">
        {t("lesson")} {item.position}
      </div>

      {!available && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className={cn("rounded-full border border-primary/40 bg-background/70 p-4 backdrop-blur", shake && "animate-shake")}>
            {item.state === "countdown" ? <Clock className="size-7 text-primary" /> : <Lock className="size-7 text-primary" />}
          </div>
          {item.state === "countdown" && item.unlockAt && (
            <div className="text-center">
              <p className="font-display text-3xl tabular-nums text-gold">{formatCountdown(item.unlockAt - now)}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                {lang === "ml" ? "അടുത്ത ക്ലാസ് തുറക്കാൻ" : "until it opens"}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="font-display text-2xl leading-tight text-foreground">{item.title}</h3>
        <div className="mt-3 flex items-center gap-2 text-xs">
          {item.state === "done" && (
            <span className="inline-flex items-center gap-1 text-primary">
              <CheckCircle2 className="size-4" /> {t("completed")}
            </span>
          )}
          {item.state === "open" && (
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground animate-glow">
              <Play className="size-3.5 fill-current" /> {t("startLearning")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ClassViewer({ item, onClose }: { item: StudentClass; onClose: () => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [playing, setPlaying] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const video = useQuery({
    queryKey: ["class-video", item.id],
    enabled: playing,
    staleTime: 60 * 60 * 1000,
    queryFn: () => studentAction<{ videoUrl: string | null }>("watch", item.id),
  });

  const markDone = useMutation({
    mutationFn: () => studentAction("done", item.id),
    onSuccess: async () => {
      setCelebrate(true);
      toast.success(
        lang === "ml" ? "നന്നായി! അടുത്ത ക്ലാസ് 24 മണിക്കൂറിൽ തുറക്കും." : "Well done! Your next class opens in 24 hours.",
      );
      await queryClient.invalidateQueries({ queryKey: ["my-classes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-md sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[94vh] w-full max-w-3xl animate-rise overflow-y-auto rounded-t-3xl border border-border surface-card sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full bg-background/70 p-2 text-foreground/80 backdrop-blur transition hover:rotate-90 hover:text-primary"
        >
          <X className="size-5" />
        </button>

        <div className="relative aspect-video overflow-hidden bg-black">
          {playing && video.data?.videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={video.data.videoUrl}
                {...(item.posterUrl ? { poster: item.posterUrl } : {})}
                autoPlay
                controls
                playsInline
                controlsList="nodownload"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className="h-full w-full"
              />
              <span className="pointer-events-none absolute right-3 top-3 rounded bg-black/45 px-2 py-1 text-[10px] text-white/80">
                {user?.email}
              </span>
            </>
          ) : (
            <button onClick={() => setPlaying(true)} className="group absolute inset-0" disabled={!item.hasVideo}>
              {item.posterUrl && (
                <img src={item.posterUrl} alt="" draggable={false} className="h-full w-full object-cover animate-ken-burns no-select" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {item.hasVideo && (
                <span className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition group-hover:scale-110 animate-glow">
                  {video.isFetching ? (
                    <span className="size-7 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Play className="ml-1 size-8 fill-current" />
                  )}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="relative p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.3em] text-primary">
            {t("lesson")} {item.position}
          </p>
          <h2 className="mt-2 font-display text-3xl text-foreground">{item.title}</h2>
          {item.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          )}

          <div className="relative mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-6 text-center">
            {celebrate && <Burst />}
            {item.state === "done" ? (
              <>
                <CheckCircle2 className="size-10 text-primary" />
                <p className="font-display text-xl text-gold">{t("completed")}</p>
                <p className="text-xs text-muted-foreground">
                  {lang === "ml"
                    ? "അടുത്ത ക്ലാസ് 24 മണിക്കൂറിന് ശേഷം തുറക്കും."
                    : "The next class opens 24 hours after you finished this one."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {lang === "ml"
                    ? "വീഡിയോ കണ്ട് കഴിഞ്ഞാൽ 'Done' അമർത്തുക. 24 മണിക്കൂറിന് ശേഷം അടുത്ത ക്ലാസ് തുറക്കും."
                    : "Finished watching? Tap Done — your next class unlocks 24 hours later."}
                </p>
                <Button size="lg" className="mt-1 min-w-40 animate-glow" disabled={markDone.isPending} onClick={() => markDone.mutate()}>
                  <CheckCircle2 className="mr-2 size-5" /> Done
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
