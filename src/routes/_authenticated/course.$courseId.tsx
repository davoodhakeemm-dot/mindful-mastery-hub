import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, FileText } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { getLessonMedia } from "@/lib/media.functions";
import { useLanguage, useT } from "@/lib/i18n";
import { useProfile, useSession } from "@/lib/useAuth";

export const Route = createFileRoute("/_authenticated/course/$courseId")({
  component: CoursePlayer,
});

function CoursePlayer() {
  const { courseId } = Route.useParams();
  const t = useT();
  const { lang } = useLanguage();
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const fetchMedia = useServerFn(getLessonMedia);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title_en, title_ml")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("lesson_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: progressRows } = useQuery({
    queryKey: ["progress", user?.id, courseId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_progress")
        .select("lesson_id, completed");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lesson = lessons?.[activeIndex];

  const { data: media } = useQuery({
    queryKey: ["lesson-media", lesson?.id],
    enabled: !!lesson,
    queryFn: () => fetchMedia({ data: { lessonId: lesson!.id } }),
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [courseId]);

  const completedIds = new Set(
    (progressRows ?? []).filter((p) => p.completed).map((p) => p.lesson_id),
  );
  const total = lessons?.length ?? 0;
  const done = (lessons ?? []).filter((l) => completedIds.has(l.id)).length;
  const isDone = lesson ? completedIds.has(lesson.id) : false;

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!user || !lesson) return;
      const { error } = await supabase.from("student_progress").upsert(
        { user_id: user.id, lesson_id: lesson.id, completed: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", user?.id, courseId] });
      toast.success(t("completed"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profile && profile.status !== "approved") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
          {profile.status === "pending" ? t("pendingApproval") : t("suspended")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-6">
        <Link to="/dashboard" className="text-xs text-muted-foreground underline">
          ← {t("myClasses")}
        </Link>
        <h1 className="mt-3 font-display text-2xl text-foreground">
          {course ? (lang === "ml" ? course.title_ml : course.title_en) : ""}
        </h1>

        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("progress")}</span>
              <span>
                {done}/{total}
              </span>
            </div>
            <Progress className="mt-2" value={total ? (done / total) * 100 : 0} />
          </div>
        )}

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">…</p>}
        {!isLoading && total === 0 && (
          <p className="mt-8 rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            {t("noAccess")}
          </p>
        )}

        {lesson && (
          <article className="mt-6 rounded-3xl surface-card p-5">
            <p className="text-xs uppercase tracking-wide text-primary">
              {t("lesson")} {lesson.lesson_number}
            </p>
            <h2 className="mt-1 font-display text-xl text-foreground">
              {(lang === "ml" ? lesson.title_ml : lesson.title_en) || lesson.title_en}
            </h2>

            {media?.authorized && media.videoUrl && (
              <div className="relative mt-4 overflow-hidden rounded-2xl bg-black">
                <video
                  src={media.videoUrl}
                  controls
                  controlsList="nodownload"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full"
                />
                <span className="pointer-events-none absolute right-3 top-3 rounded bg-black/45 px-2 py-1 text-[10px] text-white/80">
                  {profile?.full_name ?? user?.email}
                </span>
              </div>
            )}

            {media?.authorized && media.imageUrl && (
              <img
                src={media.imageUrl}
                alt=""
                onContextMenu={(e) => e.preventDefault()}
                className="mt-4 w-full rounded-2xl no-select"
                draggable={false}
              />
            )}

            <div className="mt-4 space-y-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {(lang === "ml" ? lesson.content_ml : lesson.content_en) ??
                (lang === "ml" ? lesson.description_ml : lesson.description_en) ??
                ""}
            </div>

            {lesson.notes && (
              <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold text-primary">{t("notes")}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{lesson.notes}</p>
              </div>
            )}

            {media?.authorized && media.pdfUrl && (
              <a
                href={media.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline"
              >
                <FileText className="size-4" /> PDF
              </a>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              >
                {t("previous")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={activeIndex >= total - 1}
                onClick={() => setActiveIndex((i) => Math.min(total - 1, i + 1))}
              >
                {t("next")}
              </Button>
              <Button
                size="sm"
                className="ml-auto"
                disabled={isDone || markComplete.isPending}
                onClick={() => markComplete.mutate()}
              >
                {isDone ? (
                  <>
                    <CheckCircle2 className="mr-1 size-4" /> {t("completed")}
                  </>
                ) : (
                  t("markComplete")
                )}
              </Button>
            </div>
          </article>
        )}

        {total > 1 && (
          <ol className="mt-6 grid gap-2">
            {lessons?.map((l, i) => (
              <li key={l.id}>
                <button
                  onClick={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-sm ${
                    i === activeIndex
                      ? "border-primary/60 bg-secondary/60 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <span className="text-xs text-primary">{l.lesson_number}</span>
                  <span className="flex-1">{(lang === "ml" ? l.title_ml : l.title_en) || l.title_en}</span>
                  {completedIds.has(l.id) && <CheckCircle2 className="size-4 text-primary" />}
                </button>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
