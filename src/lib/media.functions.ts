import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns short-lived signed URLs for a lesson's private media, only after
 * verifying the session, the account status and the course authorization.
 * Raw storage paths are never exposed to the client.
 */
export const getLessonMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) =>
    z.object({ lessonId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS on lessons already enforces approved status + course authorization.
    const { data: lesson, error } = await context.supabase
      .from("lessons")
      .select("id, course_id, video_path, pdf_path, image_path")
      .eq("id", data.lessonId)
      .maybeSingle();

    if (error) throw new Error("Unable to load lesson");
    if (!lesson) return { authorized: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sign = async (path: string | null) => {
      if (!path) return null;
      const { data: signed } = await supabaseAdmin.storage
        .from("course-media")
        .createSignedUrl(path, 60 * 60);
      return signed?.signedUrl ?? null;
    };

    return {
      authorized: true as const,
      videoUrl: await sign(lesson.video_path),
      pdfUrl: await sign(lesson.pdf_path),
      imageUrl: await sign(lesson.image_path),
    };
  });

/** Signed URL for a student's private profile photo (owner or admin only). */
export const getStudentPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) =>
    z.object({ path: z.string().max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const isOwner = data.path.startsWith(`${context.userId}/`);
    if (!isOwner) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) return { url: null };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("student-photos")
      .createSignedUrl(data.path, 60 * 30);
    return { url: signed?.signedUrl ?? null };
  });
