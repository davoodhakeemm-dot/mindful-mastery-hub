import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  deleteCourse,
  deleteLesson,
  getAdminCourseAccess,
  getAdminCourses,
  getAdminLessons,
  getAdminProgress,
  getAdminStatus,
  getAdminStudents,
  grantCourseAccess,
  revokeCourseAccess,
  saveCourse,
  saveLesson,
  updateStudentStatus,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Tab =
  | "overview"
  | "students"
  | "courses"
  | "lessons"
  | "access"
  | "progress";

function AdminPage() {
  const navigate = useNavigate();

  const checkAdmin = useServerFn(getAdminStatus);
  const loadStudents = useServerFn(getAdminStudents);
  const changeStudentStatus = useServerFn(updateStudentStatus);

  const loadCourses = useServerFn(getAdminCourses);
  const saveCourseFn = useServerFn(saveCourse);
  const removeCourse = useServerFn(deleteCourse);

  const loadLessons = useServerFn(getAdminLessons);
  const saveLessonFn = useServerFn(saveLesson);
  const removeLesson = useServerFn(deleteLesson);

  const loadAccess = useServerFn(getAdminCourseAccess);
  const grantAccess = useServerFn(grantCourseAccess);
  const revokeAccess = useServerFn(revokeCourseAccess);

  const loadProgress = useServerFn(getAdminProgress);

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [access, setAccess] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);

  const [courseForm, setCourseForm] = useState({
    id: "",
    slug: "",
    titleEn: "",
    titleMl: "",
    descriptionEn: "",
    descriptionMl: "",
    language: "ml-en",
    coverPath: "",
  });

  const [lessonForm, setLessonForm] = useState({
    id: "",
    courseId: "",
    lessonNumber: 1,
    titleEn: "",
    titleMl: "",
    descriptionEn: "",
    descriptionMl: "",
    contentEn: "",
    contentMl: "",
    notes: "",
    videoPath: "",
    pdfPath: "",
    imagePath: "",
  });

  const [accessForm, setAccessForm] = useState({
    gmail: "",
    courseId: "",
  });

  const [saving, setSaving] = useState(false);

  const refreshStudents = async () => {
    const result = await loadStudents({});

    setStudents(result.students);
  };

  const refreshCourses = async () => {
    const result = await loadCourses({});

    setCourses(result.courses);
  };

  const refreshLessons = async () => {
    const result = await loadLessons({});

    setLessons(result.lessons);
  };

  const refreshAccess = async () => {
    const result = await loadAccess({});

    setAccess(result.access);
  };

  const refreshProgress = async () => {
    const result = await loadProgress({});

    setProgress(result.progress);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const result = await checkAdmin({});

        if (!result.isAdmin) {
          toast.error("Admin access required");
          navigate({
            to: "/dashboard",
            replace: true,
          });
          return;
        }

        if (!mounted) return;

        await Promise.all([
          refreshStudents(),
          refreshCourses(),
          refreshLessons(),
          refreshAccess(),
          refreshProgress(),
        ]);
      } catch (error) {
        console.error(error);

        toast.error("Unable to load Admin Space");

        navigate({
          to: "/dashboard",
          replace: true,
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  const pendingStudents = useMemo(
    () =>
      students.filter(
        (student) => student.status === "pending",
      ).length,
    [students],
  );

  const approvedStudents = useMemo(
    () =>
      students.filter(
        (student) => student.status === "approved",
      ).length,
    [students],
  );

  const suspendedStudents = useMemo(
    () =>
      students.filter(
        (student) => student.status === "suspended",
      ).length,
    [students],
  );

  const updateStatus = async (
    userId: string,
    status:
      | "pending"
      | "approved"
      | "suspended"
      | "removed",
  ) => {
    try {
      await changeStudentStatus({
        data: {
          userId,
          status,
        },
      });

      toast.success(
        `Student ${status}`,
      );

      await refreshStudents();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update student");
    }
  };

  const resetCourseForm = () => {
    setCourseForm({
      id: "",
      slug: "",
      titleEn: "",
      titleMl: "",
      descriptionEn: "",
      descriptionMl: "",
      language: "ml-en",
      coverPath: "",
    });
  };

  const editCourse = (course: any) => {
    setCourseForm({
      id: course.id,
      slug: course.slug ?? "",
      titleEn: course.title_en ?? "",
      titleMl: course.title_ml ?? "",
      descriptionEn: course.description_en ?? "",
      descriptionMl: course.description_ml ?? "",
      language: course.language ?? "ml-en",
      coverPath: course.cover_path ?? "",
    });

    setTab("courses");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const submitCourse = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!courseForm.titleEn.trim()) {
      toast.error("English course title is required");
      return;
    }

    if (!courseForm.titleMl.trim()) {
      toast.error("Malayalam course title is required");
      return;
    }

    if (!courseForm.slug.trim()) {
      toast.error("Course slug is required");
      return;
    }

    setSaving(true);

    try {
      await saveCourseFn({
        data: {
          id: courseForm.id || undefined,
          slug: courseForm.slug.trim(),
          titleEn: courseForm.titleEn.trim(),
          titleMl: courseForm.titleMl.trim(),
          descriptionEn:
            courseForm.descriptionEn || undefined,
          descriptionMl:
            courseForm.descriptionMl || undefined,
          language: courseForm.language,
          coverPath:
            courseForm.coverPath || undefined,
        },
      });

      toast.success(
        courseForm.id
          ? "Course updated"
          : "Course created",
      );

      resetCourseForm();

      await refreshCourses();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save course");
    } finally {
      setSaving(false);
    }
  };

  const removeCourseConfirm = async (
    courseId: string,
  ) => {
    const confirmed = window.confirm(
      "Delete this course and its lessons? This cannot be undone.",
    );

    if (!confirmed) return;

    try {
      await removeCourse({
        data: {
          courseId,
        },
      });

      toast.success("Course deleted");

      await Promise.all([
        refreshCourses(),
        refreshLessons(),
        refreshAccess(),
      ]);
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete course");
    }
  };

  const resetLessonForm = () => {
    setLessonForm({
      id: "",
      courseId: courses[0]?.id ?? "",
      lessonNumber: 1,
      titleEn: "",
      titleMl: "",
      descriptionEn: "",
      descriptionMl: "",
      contentEn: "",
      contentMl: "",
      notes: "",
      videoPath: "",
      pdfPath: "",
      imagePath: "",
    });
  };

  const editLesson = (lesson: any) => {
    setLessonForm({
      id: lesson.id,
      courseId: lesson.course_id,
      lessonNumber: lesson.lesson_number ?? 1,
      titleEn: lesson.title_en ?? "",
      titleMl: lesson.title_ml ?? "",
      descriptionEn:
        lesson.description_en ?? "",
      descriptionMl:
        lesson.description_ml ?? "",
      contentEn: lesson.content_en ?? "",
      contentMl: lesson.content_ml ?? "",
      notes: lesson.notes ?? "",
      videoPath: lesson.video_path ?? "",
      pdfPath: lesson.pdf_path ?? "",
      imagePath: lesson.image_path ?? "",
    });

    setTab("lessons");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const submitLesson = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!lessonForm.courseId) {
      toast.error("Select a course");
      return;
    }

    if (!lessonForm.titleEn.trim()) {
      toast.error("English lesson title is required");
      return;
    }

    setSaving(true);

    try {
      await saveLessonFn({
        data: {
          id: lessonForm.id || undefined,
          courseId: lessonForm.courseId,
          lessonNumber: Number(
            lessonForm.lessonNumber,
          ),
          titleEn: lessonForm.titleEn.trim(),
          titleMl:
            lessonForm.titleMl || undefined,
          descriptionEn:
            lessonForm.descriptionEn || undefined,
          descriptionMl:
            lessonForm.descriptionMl || undefined,
          contentEn:
            lessonForm.contentEn || undefined,
          contentMl:
            lessonForm.contentMl || undefined,
          notes:
            lessonForm.notes || undefined,
          videoPath:
            lessonForm.videoPath || undefined,
          pdfPath:
            lessonForm.pdfPath || undefined,
          imagePath:
            lessonForm.imagePath || undefined,
        },
      });

      toast.success(
        lessonForm.id
          ? "Lesson updated"
          : "Lesson created",
      );

      resetLessonForm();

      await refreshLessons();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const removeLessonConfirm = async (
    lessonId: string,
  ) => {
    const confirmed = window.confirm(
      "Delete this lesson?",
    );

    if (!confirmed) return;

    try {
      await removeLesson({
        data: {
          lessonId,
        },
      });

      toast.success("Lesson deleted");

      await refreshLessons();
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete lesson");
    }
  };

  const submitAccess = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!accessForm.gmail.trim()) {
      toast.error("Enter student Gmail");
      return;
    }

    if (!accessForm.courseId) {
      toast.error("Select a course");
      return;
    }

    try {
      await grantAccess({
        data: {
          gmail:
            accessForm.gmail.trim().toLowerCase(),
          courseId:
            accessForm.courseId,
        },
      });

      toast.success("Course access granted");

      setAccessForm({
        gmail: "",
        courseId: "",
      });

      await refreshAccess();
    } catch (error) {
      console.error(error);
      toast.error("Unable to grant course access");
    }
  };

  const revokeAccessConfirm = async (
    accessId: string,
  ) => {
    const confirmed = window.confirm(
      "Revoke this student's course access?",
    );

    if (!confirmed) return;

    try {
      await revokeAccess({
        data: {
          accessId,
        },
      });

      toast.success("Access revoked");

      await refreshAccess();
    } catch (error) {
      console.error(error);
      toast.error("Unable to revoke access");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading Admin Space...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              DH Hypnotism
            </p>

            <h1 className="text-2xl font-bold">
              Admin Space
            </h1>

            <p className="text-sm text-muted-foreground">
              Malayalam • English
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: "/dashboard",
              })
            }
          >
            ← Dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <AdminTab
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Overview
          </AdminTab>

          <AdminTab
            active={tab === "students"}
            onClick={() => setTab("students")}
          >
            Students
          </AdminTab>

          <AdminTab
            active={tab === "courses"}
            onClick={() => setTab("courses")}
          >
            Courses
          </AdminTab>

          <AdminTab
            active={tab === "lessons"}
            onClick={() => setTab("lessons")}
          >
            Lessons
          </AdminTab>

          <AdminTab
            active={tab === "access"}
            onClick={() => setTab("access")}
          >
            Access
          </AdminTab>

          <AdminTab
            active={tab === "progress"}
            onClick={() => setTab("progress")}
          >
            Progress
          </AdminTab>
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Students"
                value={students.length}
              />

              <StatCard
                title="Pending"
                value={pendingStudents}
              />

              <StatCard
                title="Approved"
                value={approvedStudents}
              />

              <StatCard
                title="Courses"
                value={courses.length}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Student Status">
                <div className="space-y-3">
                  <StatusRow
                    label="Pending"
                    value={pendingStudents}
                  />

                  <StatusRow
                    label="Approved"
                    value={approvedStudents}
                  />

                  <StatusRow
                    label="Suspended"
                    value={suspendedStudents}
                  />

                  <StatusRow
                    label="Removed"
                    value={
                      students.filter(
                        (s) =>
                          s.status === "removed",
                      ).length
                    }
                  />
                </div>
              </Panel>

              <Panel title="Learning">
                <div className="space-y-3">
                  <StatusRow
                    label="Courses"
                    value={courses.length}
                  />

                  <StatusRow
                    label="Lessons"
                    value={lessons.length}
                  />

                  <StatusRow
                    label="Course access records"
                    value={access.length}
                  />

                  <StatusRow
                    label="Progress records"
                    value={progress.length}
                  />
                </div>
              </Panel>
            </div>
          </section>
        )}

        {/* Students */}
        {tab === "students" && (
          <section>
            <SectionHeading
              title="Students"
              subtitle="Manage registrations and account status"
              action={
                <Button
                  variant="outline"
                  onClick={refreshStudents}
                >
                  Refresh
                </Button>
              }
            />

            <div className="mt-4 space-y-4">
              {students.length === 0 && (
                <EmptyState text="No students registered yet." />
              )}

              {students.map((student) => (
                <div
                  key={student.id}
                  className="rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {student.full_name}
                        </h3>

                        <StatusBadge
                          status={student.status}
                        />
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>
                          Gmail: {student.gmail}
                        </p>

                        <p>
                          Age:{" "}
                          {student.age ?? "—"}
                        </p>

                        <p>
                          Phone:{" "}
                          {student.phone ?? "—"}
                        </p>

                        <p>
                          WhatsApp:{" "}
                          {student.whatsapp ?? "—"}
                        </p>

                        <p>
                          Course:{" "}
                          {student.selected_course ??
                            "—"}
                        </p>

                        <p>
                          Registered:{" "}
                          {formatDate(
                            student.registered_at,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {student.status !==
                        "approved" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus(
                              student.id,
                              "approved",
                            )
                          }
                        >
                          Approve
                        </Button>
                      )}

                      {student.status !==
                        "suspended" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus(
                              student.id,
                              "suspended",
                            )
                          }
                        >
                          Suspend
                        </Button>
                      )}

                      {student.status !==
                        "removed" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateStatus(
                              student.id,
                              "removed",
                            )
                          }
                        >
                          Remove
                        </Button>
                      )}

                      {student.status ===
                        "removed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus(
                              student.id,
                              "approved",
                            )
                          }
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Courses */}
        {tab === "courses" && (
          <section>
            <SectionHeading
              title="Courses"
              subtitle="Create and manage your hypnotism courses"
            />

            <Panel
              title={
                courseForm.id
                  ? "Edit Course"
                  : "Create Course"
              }
            >
              <form
                onSubmit={submitCourse}
                className="grid gap-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="English title">
                    <Input
                      value={courseForm.titleEn}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          titleEn: e.target.value,
                        })
                      }
                      placeholder="Hypnotism Fundamentals"
                    />
                  </Field>

                  <Field label="Malayalam title">
                    <Input
                      value={courseForm.titleMl}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          titleMl: e.target.value,
                        })
                      }
                      placeholder="ഹിപ്നോട്ടിസം അടിസ്ഥാനങ്ങൾ"
                    />
                  </Field>

                  <Field label="Slug">
                    <Input
                      value={courseForm.slug}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          slug: e.target.value,
                        })
                      }
                      placeholder="hypnotism-fundamentals"
                    />
                  </Field>

                  <Field label="Language">
                    <Input
                      value={courseForm.language}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          language: e.target.value,
                        })
                      }
                      placeholder="ml-en"
                    />
                  </Field>
                </div>

                <Field label="English description">
                  <textarea
                    className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm"
                    value={
                      courseForm.descriptionEn
                    }
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        descriptionEn:
                          e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="Malayalam description">
                  <textarea
                    className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm"
                    value={
                      courseForm.descriptionMl
                    }
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        descriptionMl:
                          e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="Cover storage path (optional)">
                  <Input
                    value={courseForm.coverPath}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        coverPath:
                          e.target.value,
                      })
                    }
                    placeholder="courses/course-id/cover.jpg"
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : courseForm.id
                        ? "Update Course"
                        : "Create Course"}
                  </Button>

                  {courseForm.id && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetCourseForm}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </Panel>

            <div className="mt-6 grid gap-4">
              {courses.length === 0 && (
                <EmptyState text="No courses created yet." />
              )}

              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border bg-card p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {course.title_en}
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        {course.title_ml}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        /{course.slug}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          editCourse(course)
                        }
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          removeCourseConfirm(
                            course.id,
                          )
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lessons */}
        {tab === "lessons" && (
          <section>
            <SectionHeading
              title="Lessons"
              subtitle="Create bilingual lessons and attach media paths"
            />

            {courses.length === 0 ? (
              <EmptyState text="Create a course before creating lessons." />
            ) : (
              <>
                <Panel
                  title={
                    lessonForm.id
                      ? "Edit Lesson"
                      : "Create Lesson"
                  }
                >
                  <form
                    onSubmit={submitLesson}
                    className="grid gap-4"
                  >
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Course">
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={
                            lessonForm.courseId
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              courseId:
                                e.target.value,
                            })
                          }
                        >
                          <option value="">
                            Select course
                          </option>

                          {courses.map(
                            (course) => (
                              <option
                                key={course.id}
                                value={course.id}
                              >
                                {course.title_en}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>

                      <Field label="Lesson number">
                        <Input
                          type="number"
                          min={1}
                          value={
                            lessonForm.lessonNumber
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              lessonNumber:
                                Number(
                                  e.target.value,
                                ),
                            })
                          }
                        />
                      </Field>

                      <Field label="English title">
                        <Input
                          value={
                            lessonForm.titleEn
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              titleEn:
                                e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Malayalam title">
                      <Input
                        value={lessonForm.titleMl}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            titleMl:
                              e.target.value,
                          })
                        }
                      />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="English description">
                        <textarea
                          className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm"
                          value={
                            lessonForm.descriptionEn
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              descriptionEn:
                                e.target.value,
                            })
                          }
                        />
                      </Field>

                      <Field label="Malayalam description">
                        <textarea
                          className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm"
                          value={
                            lessonForm.descriptionMl
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              descriptionMl:
                                e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="English content">
                        <textarea
                          className="min-h-40 w-full rounded-xl border bg-background p-3 text-sm"
                          value={
                            lessonForm.contentEn
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              contentEn:
                                e.target.value,
                            })
                          }
                        />
                      </Field>

                      <Field label="Malayalam content">
                        <textarea
                          className="min-h-40 w-full rounded-xl border bg-background p-3 text-sm"
                          value={
                            lessonForm.contentMl
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              contentMl:
                                e.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Notes">
                      <textarea
                        className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm"
                        value={lessonForm.notes}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            notes: e.target.value,
                          })
                        }
                      />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Video path">
                        <Input
                          value={
                            lessonForm.videoPath
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              videoPath:
                                e.target.value,
                            })
                          }
                          placeholder="course-media/..."
                        />
                      </Field>

                      <Field label="PDF path">
                        <Input
                          value={
                            lessonForm.pdfPath
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              pdfPath:
                                e.target.value,
                            })
                          }
                          placeholder="course-media/..."
                        />
                      </Field>

                      <Field label="Image path">
                        <Input
                          value={
                            lessonForm.imagePath
                          }
                          onChange={(e) =>
                            setLessonForm({
                              ...lessonForm,
                              imagePath:
                                e.target.value,
                            })
                          }
                          placeholder="course-media/..."
                        />
                      </Field>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : lessonForm.id
                            ? "Update Lesson"
                            : "Create Lesson"}
                      </Button>

                      {lessonForm.id && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={
                            resetLessonForm
                          }
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </form>
                </Panel>

                <div className="mt-6 space-y-4">
                  {lessons.map((lesson) => {
                    const course =
                      courses.find(
                        (c) =>
                          c.id ===
                          lesson.course_id,
                      );

                    return (
                      <div
                        key={lesson.id}
                        className="rounded-2xl border bg-card p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xs text-primary">
                              Lesson{" "}
                              {lesson.lesson_number}
                            </p>

                            <h3 className="font-semibold">
                              {lesson.title_en}
                            </h3>

                            <p className="text-sm text-muted-foreground">
                              {lesson.title_ml}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Course:{" "}
                              {course?.title_en ??
                                "Unknown"}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                editLesson(
                                  lesson,
                                )
                              }
                            >
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                removeLessonConfirm(
                                  lesson.id,
                                )
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {/* Access */}
        {tab === "access" && (
          <section>
            <SectionHeading
              title="Course Access"
              subtitle="Give or revoke course access using the student's Gmail"
            />

            <Panel title="Grant Course Access">
              <form
                onSubmit={submitAccess}
                className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
              >
                <Input
                  type="email"
                  placeholder="student@gmail.com"
                  value={accessForm.gmail}
                  onChange={(e) =>
                    setAccessForm({
                      ...accessForm,
                      gmail: e.target.value,
                    })
                  }
                />

                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={accessForm.courseId}
                  onChange={(e) =>
                    setAccessForm({
                      ...accessForm,
                      courseId:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    Select course
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.title_en}
                    </option>
                  ))}
                </select>

                <Button type="submit">
                  Grant Access
                </Button>
              </form>
            </Panel>

            <div className="mt-6 space-y-3">
              {access.length === 0 && (
                <EmptyState text="No course access records." />
              )}

              {access.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {item.gmail}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {item.courses?.title_en ??
                        item.course_id}
                    </p>

                    <StatusBadge
                      status={
                        item.revoked
                          ? "revoked"
                          : "active"
                      }
                    />
                  </div>

                  {!item.revoked && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        revokeAccessConfirm(
                          item.id,
                        )
                      }
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Progress */}
        {tab === "progress" && (
          <section>
            <SectionHeading
              title="Student Progress"
              subtitle="Lesson completion records"
              action={
                <Button
                  variant="outline"
                  onClick={refreshProgress}
                >
                  Refresh
                </Button>
              }
            />

            <div className="mt-4 space-y-3">
              {progress.length === 0 && (
                <EmptyState text="No progress records yet." />
              )}

              {progress.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border bg-card p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">
                        {item.lessons?.title_en ??
                          "Lesson"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Student:{" "}
                        {item.user_id}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        item.completed
                          ? "completed"
                          : "in progress"
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small UI components                                                        */
/* -------------------------------------------------------------------------- */

function AdminTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "border bg-card hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">
        {title}
      </h2>

      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      {children}
    </label>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-bold">
          {title}
        </h2>

        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {action}
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-3">
      <span className="text-sm">
        {label}
      </span>

      <span className="font-bold">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
