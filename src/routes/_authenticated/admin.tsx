import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  getAdminStatus,
  getAdminStudents,
  updateStudentStatus,
  getAdminCourses,
  getAdminCourseAccess,
  grantCourseAccess,
  revokeCourseAccess,
  getAdminProgress,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Tab = "overview" | "students" | "access" | "progress";

type StudentStatus = "pending" | "approved" | "suspended" | "removed";

function AdminPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [access, setAccess] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);

  const [accessForm, setAccessForm] = useState({
    gmail: "",
    courseId: "",
  });

  const loadAll = async () => {
    setLoading(true);

    try {
      const status = await getAdminStatus({
        data: undefined,
      });

      if (!status?.isAdmin) {
        toast.error("Admin access required");

        await navigate({
          to: "/dashboard",
          replace: true,
        });

        return;
      }

      const results = await Promise.allSettled([
        getAdminStudents({ data: undefined }),
        getAdminCourses({ data: undefined }),
        getAdminCourseAccess({ data: undefined }),
        getAdminProgress({ data: undefined }),
      ]);

      const studentsResult = results[0];
      const coursesResult = results[1];
      const accessResult = results[2];
      const progressResult = results[3];

      setStudents(
        studentsResult.status === "fulfilled" && Array.isArray(studentsResult.value)
          ? studentsResult.value
          : [],
      );

      setCourses(
        coursesResult.status === "fulfilled" && Array.isArray(coursesResult.value)
          ? coursesResult.value
          : [],
      );

      setAccess(
        accessResult.status === "fulfilled" && Array.isArray(accessResult.value)
          ? accessResult.value
          : [],
      );

      setProgress(
        progressResult.status === "fulfilled" && Array.isArray(progressResult.value)
          ? progressResult.value
          : [],
      );

      const failed = results.some((result) => result.status === "rejected");

      if (failed) {
        toast.warning("Some Admin Space data could not be loaded.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to load Admin Space");

      setStudents([]);
      setCourses([]);
      setAccess([]);
      setProgress([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const changeStudentStatus = async (
    userId: string,
    status: StudentStatus,
  ) => {
    try {
      await updateStudentStatus({
        data: {
          userId,
          status,
        },
      });

      toast.success(`Student ${status}`);
      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update student");
    }
  };


  const grantAccessHandler = async () => {
    const gmail =
      accessForm.gmail?.trim().toLowerCase();

    if (!gmail) {
      toast.error("Enter Gmail");
      return;
    }

    if (!accessForm.courseId) {
      toast.error("Select a course");
      return;
    }

    try {
      await grantCourseAccess({
        data: {
          gmail,
          courseId: accessForm.courseId,
        },
      });

      toast.success(
        "Course access granted",
      );

      setAccessForm({
        gmail: "",
        courseId: "",
      });

      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error(
        "Unable to grant access",
      );
    }
  };

  const revokeAccessHandler = async (
    accessId: string,
  ) => {
    try {
      await revokeCourseAccess({
        data: {
          accessId,
        },
      });

      toast.success(
        "Course access revoked",
      );

      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error(
        "Unable to revoke access",
      );
    }
  };

  const approvedCount = Array.isArray(students)
    ? students.filter(
        (student) =>
          student?.status === "approved",
      ).length
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">
            Loading Admin Space...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm font-medium text-primary">
              HYPNOTISM
            </p>

            <h1 className="text-2xl font-bold">
              Admin Space
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage students, courses and lessons
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void loadAll()}
          >
            Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            title="Students"
            value={Array.isArray(students) ? students.length : 0}
          />

          <StatCard
            title="Access"
            value={Array.isArray(access) ? access.length : 0}
          />

          <StatCard
            title="Progress"
            value={Array.isArray(progress) ? progress.length : 0}
          />

          <StatCard title="Approved" value={approvedCount} />
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            Overview
          </TabButton>

          <TabButton active={tab === "students"} onClick={() => setTab("students")}>
            Students
          </TabButton>

          <TabButton active={tab === "access"} onClick={() => setTab("access")}>
            Access
          </TabButton>

          <TabButton active={tab === "progress"} onClick={() => setTab("progress")}>
            Progress
          </TabButton>
        </div>

        {tab === "overview" && <Overview students={students} access={access} />}

        {tab === "students" && (
          <Students
            students={students}
            onStatusChange={changeStudentStatus}
          />
        )}

        {tab === "access" && (
          <Access
            courses={courses}
            access={access}
            form={accessForm}
            setForm={setAccessForm}
            onGrant={grantAccessHandler}
            onRevoke={revokeAccessHandler}
          />
        )}

        {tab === "progress" && (
          <Progress progress={progress} />
        )}
      </main>
    </div>
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
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      className="whitespace-nowrap"
    >
      {children}
    </Button>
  );
}

function Overview({
  students,
  access,
}: {
  students: any[];
  access: any[];
}) {
  const studentCount = Array.isArray(students) ? students.length : 0;
  const accessCount = Array.isArray(access) ? access.length : 0;

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <InfoCard
        title="Student Management"
        text={`${studentCount} registered students`}
      />

      <InfoCard
        title="Class Access"
        text={`${accessCount} access records`}
      />
    </section>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function Students({
  students,
  onStatusChange,
}: {
  students: any[];
  onStatusChange: (
    id: string,
    status: StudentStatus,
  ) => void;
}) {
  const safeStudents = Array.isArray(
    students,
  )
    ? students
    : [];

  return (
    <section className="rounded-3xl border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold">
        Students
      </h2>

      <div className="space-y-4">
        {safeStudents.length === 0 && (
          <Empty text="No students registered yet." />
        )}

        {safeStudents.map((student) => (
          <div
            key={student?.id}
            className="rounded-2xl border p-4"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">
                  {student?.full_name ||
                    "Unnamed student"}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {student?.gmail ||
                    "No email"}
                </p>

                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <span>
                    Phone:{" "}
                    {student?.phone ||
                      "Not provided"}
                  </span>

                  <span>
                    WhatsApp:{" "}
                    {student?.whatsapp ||
                      "Not provided"}
                  </span>

                  <span>
                    Age:{" "}
                    {student?.age ??
                      "Not provided"}
                  </span>

                  <span>
                    Status:{" "}
                    <strong>
                      {student?.status ||
                        "unknown"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    onStatusChange(
                      student.id,
                      "approved",
                    )
                  }
                >
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onStatusChange(
                      student.id,
                      "suspended",
                    )
                  }
                >
                  Suspend
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    onStatusChange(
                      student.id,
                      "removed",
                    )
                  }
                >
                  Remove
                </Button>

                {student?.status !==
                  "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onStatusChange(
                        student.id,
                        "pending",
                      )
                    }
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}



function Access({
  courses,
  access,
  form,
  setForm,
  onGrant,
  onRevoke,
}: {
  courses: any[];
  access: any[];
  form: {
    gmail: string;
    courseId: string;
  };
  setForm: (
    value: {
      gmail: string;
      courseId: string;
    },
  ) => void;
  onGrant: () => void;
  onRevoke: (id: string) => void;
}) {
  const safeCourses = Array.isArray(
    courses,
  )
    ? courses
    : [];

  const safeAccess = Array.isArray(
    access,
  )
    ? access
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5">
        <h2 className="mb-4 text-xl font-bold">
          Grant Course Access
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="email"
            placeholder="Student Gmail"
            value={form?.gmail ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                gmail:
                  e.target.value,
              })
            }
          />

          <select
            className="h-10 rounded-xl border bg-background px-3 text-sm"
            value={form?.courseId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                courseId:
                  e.target.value,
              })
            }
          >
            <option value="">
              Select course
            </option>

            {safeCourses.map((course) => (
              <option
                key={course?.id}
                value={course?.id}
              >
                {course?.title_en ||
                  "Untitled course"}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="mt-4"
          onClick={onGrant}
        >
          Grant Access
        </Button>
      </section>

      <section className="rounded-3xl border bg-card p-5">
        <h2 className="mb-4 text-xl font-bold">
          Access Records
        </h2>

        <div className="space-y-3">
          {safeAccess.length === 0 && (
            <Empty text="No access records yet." />
          )}

          {safeAccess.map((item) => (
            <div
              key={item?.id}
              className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">
                  {item?.gmail ||
                    "Unknown student"}
                </p>

                <p className="text-sm text-muted-foreground">
                  {item?.courses
                    ?.title_en ??
                    "Course"}
                </p>

                <p className="text-xs">
                  Status:{" "}
                  {item?.revoked
                    ? "Revoked"
                    : "Active"}
                </p>
              </div>

              {!item?.revoked && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    onRevoke(item.id)
                  }
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Progress({
  progress,
}: {
  progress: any[];
}) {
  const safeProgress = Array.isArray(
    progress,
  )
    ? progress
    : [];

  return (
    <section className="rounded-3xl border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold">
        Student Progress
      </h2>

      <div className="space-y-3">
        {safeProgress.length === 0 && (
          <Empty text="No progress records yet." />
        )}

        {safeProgress.map((item) => (
          <div
            key={item?.id}
            className="rounded-2xl border p-4"
          >
            <p className="font-medium">
              {item?.lessons?.title_en ??
                "Lesson"}
            </p>

            <p className="text-xs text-muted-foreground">
              Student:{" "}
              {item?.user_id ??
                "Unknown"}
            </p>

            <p className="mt-1 text-sm">
              Status:{" "}
              {item?.completed
                ? "Completed"
                : "Not completed"}
            </p>

            <p className="text-xs text-muted-foreground">
              Updated:{" "}
              {item?.updated_at
                ? new Date(
                    item.updated_at,
                  ).toLocaleString()
                : "Unknown"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Empty({
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
