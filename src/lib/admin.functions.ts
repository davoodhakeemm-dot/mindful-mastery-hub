import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function requireAdmin(context: {
  userId: string;
  supabase: any;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (error || !data) {
    throw new Error("Admin access required");
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* Hidden admin access key                                                    */
/* -------------------------------------------------------------------------- */

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
      Date.now() - WINDOW_MINUTES * 60 * 1000,
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

    const expected = process.env["ADMIN_ACCESS_KEY"] ?? "";

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
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("role", "admin");

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

/* -------------------------------------------------------------------------- */
/* Admin status                                                               */
/* -------------------------------------------------------------------------- */

export const getAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (error) {
      return { isAdmin: false };
    }

    return {
      isAdmin: !!data,
    };
  });

/* -------------------------------------------------------------------------- */
/* Students                                                                   */
/* -------------------------------------------------------------------------- */

export const getAdminStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        id,
        full_name,
        gmail,
        age,
        phone,
        whatsapp,
        address,
        photo_url,
        selected_course,
        status,
        consent_accepted,
        registered_at,
        created_at,
        last_login
        `,
      )
      .order("registered_at", {
        ascending: false,
      });

    if (error) {
      throw new Error("Unable to load students");
    }

    return {
      students: data ?? [],
    };
  });

export const updateStudentStatus = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    userId: string;
    status:
      | "pending"
      | "approved"
      | "suspended"
      | "removed";
  }) =>
    z.object({
      userId: z.string().uuid(),
      status: z.enum([
        "pending",
        "approved",
        "suspended",
        "removed",
      ]),
    }).parse(input),
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
      throw new Error("Unable to update student status");
    }

    return {
      success: true,
    };
  });

/* -------------------------------------------------------------------------- */
/* Courses                                                                    */
/* -------------------------------------------------------------------------- */

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
      .select(
        `
        id,
        slug,
        title_en,
        title_ml,
        description_en,
        description_ml,
        language,
        cover_path,
        created_at
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error("Unable to load courses");
    }

    return {
      courses: data ?? [],
    };
  });

const courseInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(150),
  titleEn: z.string().min(1).max(200),
  titleMl: z.string().min(1).max(200),
  descriptionEn: z.string().max(5000).optional(),
  descriptionMl: z.string().max(5000).optional(),
  language: z.string().min(1).max(50),
  coverPath: z.string().max(500).optional(),
});

export const saveCourse = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof courseInput>) =>
    courseInput.parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const payload = {
      slug: data.slug,
      title_en: data.titleEn,
      title_ml: data.titleMl,
      description_en: data.descriptionEn || null,
      description_ml: data.descriptionMl || null,
      language: data.language,
      cover_path: data.coverPath || null,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("courses")
        .update(payload)
        .eq("id", data.id);

      if (error) {
        throw new Error("Unable to update course");
      }

      return {
        success: true,
        id: data.id,
      };
    }

    const { data: created, error } =
      await supabaseAdmin
        .from("courses")
        .insert(payload)
        .select("id")
        .single();

    if (error) {
      throw new Error("Unable to create course");
    }

    return {
      success: true,
      id: created.id,
    };
  });

export const deleteCourse = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) =>
    z.object({
      courseId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    /*
     * Delete dependent records first because lessons and
     * course_access reference courses.
     */

    const { error: lessonError } =
      await supabaseAdmin
        .from("lessons")
        .delete()
        .eq("course_id", data.courseId);

    if (lessonError) {
      throw new Error("Unable to delete course lessons");
    }

    const { error: accessError } =
      await supabaseAdmin
        .from("course_access")
        .delete()
        .eq("course_id", data.courseId);

    if (accessError) {
      throw new Error("Unable to delete course access records");
    }

    const { error } = await supabaseAdmin
      .from("courses")
      .delete()
      .eq("id", data.courseId);

    if (error) {
      throw new Error("Unable to delete course");
    }

    return {
      success: true,
    };
  });

/* -------------------------------------------------------------------------- */
/* Lessons                                                                    */
/* -------------------------------------------------------------------------- */

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
      .select(
        `
        id,
        course_id,
        lesson_number,
        title_en,
        title_ml,
        description_en,
        description_ml,
        content_en,
        content_ml,
        notes,
        video_path,
        pdf_path,
        image_path,
        created_at
        `,
      )
      .order("lesson_number", {
        ascending: true,
      });

    if (error) {
      throw new Error("Unable to load lessons");
    }

    return {
      lessons: data ?? [],
    };
  });

const lessonInput = z.object({
  id: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  lessonNumber: z.number().int().min(1),
  titleEn: z.string().min(1).max(300),
  titleMl: z.string().max(300).optional(),
  descriptionEn: z.string().max(5000).optional(),
  descriptionMl: z.string().max(5000).optional(),
  contentEn: z.string().optional(),
  contentMl: z.string().optional(),
  notes: z.string().optional(),
  videoPath: z.string().max(500).optional(),
  pdfPath: z.string().max(500).optional(),
  imagePath: z.string().max(500).optional(),
});

export const saveLesson = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof lessonInput>) =>
    lessonInput.parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const payload = {
      course_id: data.courseId,
      lesson_number: data.lessonNumber,
      title_en: data.titleEn,
      title_ml: data.titleMl || null,
      description_en: data.descriptionEn || null,
      description_ml: data.descriptionMl || null,
      content_en: data.contentEn || null,
      content_ml: data.contentMl || null,
      notes: data.notes || null,
      video_path: data.videoPath || null,
      pdf_path: data.pdfPath || null,
      image_path: data.imagePath || null,
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
        success: true,
        id: data.id,
      };
    }

    const { data: created, error } =
      await supabaseAdmin
        .from("lessons")
        .insert(payload)
        .select("id")
        .single();

    if (error) {
      throw new Error("Unable to create lesson");
    }

    return {
      success: true,
      id: created.id,
    };
  });

export const deleteLesson = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) =>
    z.object({
      lessonId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("id", data.lessonId);

    if (error) {
      throw new Error("Unable to delete lesson");
    }

    return {
      success: true,
    };
  });

/* -------------------------------------------------------------------------- */
/* Course access                                                               */
/* -------------------------------------------------------------------------- */

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
      .select(
        `
        id,
        gmail,
        course_id,
        revoked,
        created_at,
        courses (
          title_en,
          title_ml
        )
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error("Unable to load course access");
    }

    return {
      access: data ?? [],
    };
  });

const courseAccessInput = z.object({
  gmail: z.string().email(),
  courseId: z.string().uuid(),
});

export const grantCourseAccess = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof courseAccessInput>) =>
    courseAccessInput.parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data: existing } =
      await supabaseAdmin
        .from("course_access")
        .select("id")
        .eq("gmail", data.gmail.toLowerCase())
        .eq("course_id", data.courseId)
        .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("course_access")
        .update({
          revoked: false,
        })
        .eq("id", existing.id);

      if (error) {
        throw new Error("Unable to restore course access");
      }

      return {
        success: true,
      };
    }

    const { error } = await supabaseAdmin
      .from("course_access")
      .insert({
        gmail: data.gmail.toLowerCase(),
        course_id: data.courseId,
        revoked: false,
      });

    if (error) {
      throw new Error("Unable to grant course access");
    }

    return {
      success: true,
    };
  });

export const revokeCourseAccess = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accessId: string }) =>
    z.object({
      accessId: z.string().uuid(),
    }).parse(input),
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
      throw new Error("Unable to revoke course access");
    }

    return {
      success: true,
    };
  });

/* -------------------------------------------------------------------------- */
/* Student progress                                                           */
/* -------------------------------------------------------------------------- */

export const getAdminProgress = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    const { data, error } =
      await supabaseAdmin
        .from("student_progress")
        .select(
          `
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
          `,
        )
        .order("updated_at", {
          ascending: false,
        });

    if (error) {
      throw new Error("Unable to load student progress");
    }

    return {
      progress: data ?? [],
    };
  });
