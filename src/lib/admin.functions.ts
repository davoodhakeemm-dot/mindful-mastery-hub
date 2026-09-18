import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (error || !data) {
    throw new Error("Admin access required");
  }
}

export const verifyAdminKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) =>
    z.object({
      key: z.string().max(64),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const since = new Date(
      Date.now() - WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const { count } = await supabaseAdmin
      .from("admin_key_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("success", false)
      .gte("created_at", since);

    if ((count ?? 0) >= MAX_FAILURES) {
      return {
        ok: false,
        lockedOut: true,
        isAdmin: false,
      } as const;
    }

    const expected = process.env["ADMIN_ACCESS_KEY"] || "91870";
    const ok =
      expected.length > 0 &&
      data.key.trim() === expected;

    await supabaseAdmin.from("admin_key_attempts").insert({
      user_id: context.userId,
      fingerprint: "server",
      success: ok,
    });

    if (!ok) {
      return {
        ok: false,
        lockedOut: false,
        isAdmin: false,
      } as const;
    }

    const { count: adminCount } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    /*
     * If there are no admins yet, the first successful
     * admin-key verification becomes the first admin.
     */
    if ((adminCount ?? 0) === 0) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: context.userId,
        role: "admin",
      });

      return {
        ok: true,
        lockedOut: false,
        isAdmin: true,
      } as const;
    }

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    return {
      ok: true,
      lockedOut: false,
      isAdmin: !!role,
    } as const;
  });

export const getAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc(
      "has_role",
      {
        _user_id: context.userId,
        _role: "admin",
      }
    );

    return {
      isAdmin: !error && !!data,
    };
  });

export const getAdminStudents = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("registered_at", {
        ascending: false,
      });

    if (error) {
      throw new Error("Unable to load students");
    }

    return data ?? [];
  });

export const updateStudentStatus = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      userId: string;
      status:
        | "pending"
        | "approved"
        | "suspended"
        | "removed";
    }) =>
      z
        .object({
          userId: z.string().uuid(),
          status: z.enum([
            "pending",
            "approved",
            "suspended",
            "removed",
          ]),
        })
        .parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        status: data.status,
      })
      .eq("id", data.userId);

    if (error) {
      throw new Error("Unable to update student");
    }

    return { ok: true };
  });

export const getAdminCourses = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error("Unable to load courses");
    }

    return data ?? [];
  });

export const saveCourse = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      title_en: string;
      title_ml: string;
      slug: string;
      language: string;
      description_en?: string;
      description_ml?: string;
      cover_path?: string;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          title_en: z.string().min(1).max(200),
          title_ml: z.string().max(200),
          slug: z.string().min(1).max(200),
          language: z.string().min(1).max(50),
          description_en: z.string().max(5000).optional(),
          description_ml: z.string().max(5000).optional(),
          cover_path: z.string().max(500).optional(),
        })
        .parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const payload = {
      title_en: data.title_en,
      title_ml: data.title_ml,
      slug: data.slug,
      language: data.language,
      description_en: data.description_en || null,
      description_ml: data.description_ml || null,
      cover_path: data.cover_path || null,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("courses")
        .update(payload)
        .eq("id", data.id);

      if (error) {
        throw new Error("Unable to update course");
      }

      return { ok: true, id: data.id };
    }

    const { data: created, error } =
      await supabaseAdmin
        .from("courses")
        .insert(payload)
        .select("id")
        .single();

    if (error || !created) {
      throw new Error("Unable to create course");
    }

    return {
      ok: true,
      id: created.id,
    };
  });

export const deleteCourse = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) =>
    z
      .object({
        courseId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("course_access")
      .delete()
      .eq("course_id", data.courseId);

    await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("course_id", data.courseId);

    const { error } = await supabaseAdmin
      .from("courses")
      .delete()
      .eq("id", data.courseId);

    if (error) {
      throw new Error("Unable to delete course");
    }

    return { ok: true };
  });

export const getAdminLessons = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .order("lesson_number", {
        ascending: true,
      });

    if (error) {
      throw new Error("Unable to load lessons");
    }

    return data ?? [];
  });

export const saveLesson = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      course_id: string;
      lesson_number: number;
      title_en: string;
      title_ml?: string;
      description_en?: string;
      description_ml?: string;
      content_en?: string;
      content_ml?: string;
      notes?: string;
      video_path?: string;
      pdf_path?: string;
      image_path?: string;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          course_id: z.string().uuid(),
          lesson_number: z.number().int().min(1),
          title_en: z.string().min(1).max(200),
          title_ml: z.string().max(200).optional(),
          description_en: z.string().max(5000).optional(),
          description_ml: z.string().max(5000).optional(),
          content_en: z.string().max(50000).optional(),
          content_ml: z.string().max(50000).optional(),
          notes: z.string().max(10000).optional(),
          video_path: z.string().max(500).optional(),
          pdf_path: z.string().max(500).optional(),
          image_path: z.string().max(500).optional(),
        })
        .parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const payload = {
      course_id: data.course_id,
      lesson_number: data.lesson_number,
      title_en: data.title_en,
      title_ml: data.title_ml || null,
      description_en: data.description_en || null,
      description_ml: data.description_ml || null,
      content_en: data.content_en || null,
      content_ml: data.content_ml || null,
      notes: data.notes || null,
      video_path: data.video_path || null,
      pdf_path: data.pdf_path || null,
      image_path: data.image_path || null,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("lessons")
        .update(payload)
        .eq("id", data.id);

      if (error) {
        throw new Error("Unable to update lesson");
      }

      return {
        ok: true,
        id: data.id,
      };
    }

    const { data: created, error } =
      await supabaseAdmin
        .from("lessons")
        .insert(payload)
        .select("id")
        .single();

    if (error || !created) {
      throw new Error("Unable to create lesson");
    }

    return {
      ok: true,
      id: created.id,
    };
  });

export const deleteLesson = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) =>
    z
      .object({
        lessonId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("student_progress")
      .delete()
      .eq("lesson_id", data.lessonId);

    const { error } = await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("id", data.lessonId);

    if (error) {
      throw new Error("Unable to delete lesson");
    }

    return { ok: true };
  });

export const getAdminCourseAccess = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("course_access")
      .select(`
        id,
        gmail,
        course_id,
        created_at,
        revoked,
        courses (
          title_en,
          title_ml
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error("Unable to load access records");
    }

    return data ?? [];
  });

export const grantCourseAccess = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      gmail: string;
      courseId: string;
    }) =>
      z
        .object({
          gmail: z.string().email(),
          courseId: z.string().uuid(),
        })
        .parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("course_access")
      .upsert(
        {
          gmail: data.gmail.trim().toLowerCase(),
          course_id: data.courseId,
          revoked: false,
        },
        {
          onConflict: "gmail,course_id",
        }
      );

    if (error) {
      throw new Error("Unable to grant course access");
    }

    return { ok: true };
  });

export const revokeCourseAccess = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accessId: string }) =>
    z
      .object({
        accessId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("course_access")
      .update({
        revoked: true,
      })
      .eq("id", data.accessId);

    if (error) {
      throw new Error("Unable to revoke access");
    }

    return { ok: true };
  });

export const getAdminProgress = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("student_progress")
      .select(`
        id,
        user_id,
        lesson_id,
        completed,
        updated_at,
        lessons (
          title_en,
          title_ml,
          course_id
        )
      `)
      .order("updated_at", {
        ascending: false,
      });

    if (error) {
      throw new Error("Unable to load progress");
    }

    return data ?? [];
  });
