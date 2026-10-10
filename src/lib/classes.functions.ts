import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WAIT_MS, classStates } from "./class-rules";

const keys = () => import("./class-keys.server");

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function checkAdminKey(key: string) {
  const { ADMIN_KEY } = await keys();
  if (key.trim() !== ADMIN_KEY) throw new Error("Wrong admin key");
}

async function sign(path: string | null, bucket = "course-media") {
  if (!path) return null;
  const sb = await admin();
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60 * 3);
  return data?.signedUrl ?? null;
}

/* ---------- Public ---------- */

export const verifyPassKey = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string }) => z.object({ key: z.string().max(64) }).parse(i))
  .handler(async ({ data }) => ({ ok: data.key.trim() === (await keys()).JOIN_PASS_KEY }));

export const verifyAdminKeyOnly = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string }) => z.object({ key: z.string().max(64) }).parse(i))
  .handler(async ({ data }) => ({ ok: data.key.trim() === (await keys()).ADMIN_KEY }));

/* ---------- Student ---------- */

export const getMyClasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await admin();
    const [{ data: lessons }, { data: unlock }, { data: progress }, { data: profile }] =
      await Promise.all([
        sb.from("lessons").select("id, lesson_number, title_en, image_path, created_at").order("lesson_number").order("created_at"),
        sb.from("class_unlocks").select("user_id").eq("user_id", context.userId).maybeSingle(),
        sb.from("student_progress").select("lesson_id, completed_at").eq("user_id", context.userId),
        sb.from("profiles").select("full_name, photo_url, gmail, phone").eq("id", context.userId).maybeSingle(),
      ]);
    const list = lessons ?? [];
    const done = new Map<string, number>();
    for (const p of progress ?? []) if (p.completed_at) done.set(p.lesson_id, new Date(p.completed_at).getTime());
    const states = classStates(list.map((l) => l.id), done, !!unlock, Date.now());
    const classes = await Promise.all(
      list.map(async (l, i) => ({
        id: l.id,
        number: i + 1,
        title: l.title_en,
        posterUrl: await sign(l.image_path),
        ...states[i]!,
      })),
    );
    return {
      unlocked: !!unlock,
      profile: profile
        ? { ...profile, photoUrl: await sign(profile.photo_url, "student-photos") }
        : null,
      classes,
    };
  });

export const unlockWithCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string }) => z.object({ code: z.string().max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.code.trim() !== (await keys()).REGISTRATION_CODE) return { ok: false };
    const sb = await admin();
    await sb.from("class_unlocks").upsert({ user_id: context.userId });
    return { ok: true };
  });

async function stateFor(userId: string, lessonId: string) {
  const sb = await admin();
  const [{ data: lessons }, { data: unlock }, { data: progress }] = await Promise.all([
    sb.from("lessons").select("id").order("lesson_number").order("created_at"),
    sb.from("class_unlocks").select("user_id").eq("user_id", userId).maybeSingle(),
    sb.from("student_progress").select("lesson_id, completed_at").eq("user_id", userId),
  ]);
  const ids = (lessons ?? []).map((l) => l.id);
  const done = new Map<string, number>();
  for (const p of progress ?? []) if (p.completed_at) done.set(p.lesson_id, new Date(p.completed_at).getTime());
  const idx = ids.indexOf(lessonId);
  if (idx < 0) return null;
  return classStates(ids, done, !!unlock, Date.now())[idx]!;
}

export const getClassPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const st = await stateFor(context.userId, data.id);
    if (!st || (st.state !== "open" && st.state !== "completed")) return { allowed: false as const, state: st };
    const sb = await admin();
    const { data: l } = await sb
      .from("lessons")
      .select("id, title_en, title_ml, description_en, description_ml, image_path, video_path, video_url")
      .eq("id", data.id)
      .single();
    return {
      allowed: true as const,
      state: st,
      title: l?.title_en ?? "",
      titleMl: l?.title_ml ?? l?.title_en ?? "",
      description: l?.description_en ?? "",
      descriptionMl: l?.description_ml ?? l?.description_en ?? "",
      posterUrl: await sign(l?.image_path ?? null),
      videoUrl: l?.video_path ? await sign(l.video_path) : null,
      videoLink: l?.video_url ?? null,
    };
  });

export const completeClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const st = await stateFor(context.userId, data.id);
    if (!st || st.state !== "open") return { ok: false };
    const sb = await admin();
    const now = new Date().toISOString();
    await sb
      .from("student_progress")
      .upsert(
        { user_id: context.userId, lesson_id: data.id, completed: true, completed_at: now, updated_at: now },
        { onConflict: "user_id,lesson_id" },
      );
    return { ok: true, nextOpensAt: Date.now() + WAIT_MS };
  });

/* ---------- Admin (key protected) ---------- */

const keyed = z.object({ key: z.string().max(64) });

export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string }) => keyed.parse(i))
  .handler(async ({ data }) => {
    await checkAdminKey(data.key);
    const sb = await admin();
    const [{ data: lessons }, { data: students }, { data: unlocks }, { data: progress }] = await Promise.all([
      sb.from("lessons").select("id, lesson_number, title_en, image_path, video_path, video_url, created_at").order("lesson_number").order("created_at"),
      sb.from("profiles").select("*").order("registered_at", { ascending: false }),
      sb.from("class_unlocks").select("user_id"),
      sb.from("student_progress").select("user_id, completed_at"),
    ]);
    const unlocked = new Set((unlocks ?? []).map((u) => u.user_id));
    return {
      classes: await Promise.all(
        (lessons ?? []).map(async (l, i) => ({
          id: l.id,
          number: i + 1,
          title: l.title_en,
          posterUrl: await sign(l.image_path),
          hasVideo: !!l.video_path || !!l.video_url,
        })),
      ),
      students: await Promise.all(
        (students ?? []).map(async (s) => ({
          ...s,
          photoUrl: await sign(s.photo_url, "student-photos"),
          unlocked: unlocked.has(s.id),
          completedCount: (progress ?? []).filter((p) => p.user_id === s.id && p.completed_at).length,
        })),
      ),
    };
  });

export const adminUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string; kind: "poster" | "video"; ext: string }) =>
    z.object({ key: z.string().max(64), kind: z.enum(["poster", "video"]), ext: z.string().regex(/^[a-z0-9]{1,6}$/) }).parse(i),
  )
  .handler(async ({ data }) => {
    await checkAdminKey(data.key);
    const sb = await admin();
    const path = `classes/${data.kind}/${crypto.randomUUID()}.${data.ext}`;
    const { data: up, error } = await sb.storage.from("course-media").createSignedUploadUrl(path);
    if (error || !up) throw new Error("Upload not available");
    return { path, token: up.token };
  });

export const adminCreateClass = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string; title: string; description?: string; posterPath: string; videoPath?: string | null; videoUrl?: string | null }) =>
    z
      .object({
        key: z.string().max(64),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        posterPath: z.string().max(300),
        videoPath: z.string().max(300).nullish(),
        videoUrl: z.string().trim().url().max(1000).nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    await checkAdminKey(data.key);
    if (!data.videoPath && !data.videoUrl) throw new Error("Add a video file or link");
    const sb = await admin();
    const { data: course } = await sb.from("courses").select("id").order("created_at").limit(1).maybeSingle();
    if (!course) throw new Error("No course found");
    const { data: last } = await sb.from("lessons").select("lesson_number").order("lesson_number", { ascending: false }).limit(1).maybeSingle();
    const { error } = await sb.from("lessons").insert({
      course_id: course.id,
      lesson_number: (last?.lesson_number ?? 0) + 1,
      title_en: data.title,
      title_ml: data.title,
      description_en: data.description || null,
      image_path: data.posterPath,
      video_path: data.videoPath || null,
      video_url: data.videoUrl || null,
    });
    if (error) throw new Error("Could not save class");
    return { ok: true };
  });

export const adminDeleteClass = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string; id: string }) => z.object({ key: z.string().max(64), id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await checkAdminKey(data.key);
    const sb = await admin();
    await sb.from("student_progress").delete().eq("lesson_id", data.id);
    await sb.from("lessons").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminSetUnlock = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string; userId: string; unlocked: boolean }) =>
    z.object({ key: z.string().max(64), userId: z.string().uuid(), unlocked: z.boolean() }).parse(i),
  )
  .handler(async ({ data }) => {
    await checkAdminKey(data.key);
    const sb = await admin();
    if (data.unlocked) await sb.from("class_unlocks").upsert({ user_id: data.userId });
    else await sb.from("class_unlocks").delete().eq("user_id", data.userId);
    return { ok: true };
  });

export const adminSetStudentStatus = createServerFn({ method: "POST" })
  .inputValidator((i: { key: string; userId: string; status: "pending" | "approved" | "suspended" | "removed" }) =>
    z.object({
      key: z.string().max(64),
      userId: z.string().uuid(),
      status: z.enum(["pending", "approved", "suspended", "removed"]),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    await checkAdminKey(data.key);
    const sb = await admin();
    const { error } = await sb.from("profiles").update({ status: data.status }).eq("id", data.userId);
    if (error) throw new Error("Could not update student status");
    return { ok: true };
  });
