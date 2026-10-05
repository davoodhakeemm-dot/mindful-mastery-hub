import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Film,
  ImagePlus,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
  Users,
  Wand2,
  X,
} from "lucide-react";

import { HypnoBackdrop, Reveal, useNow } from "@/components/Atmosphere";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCall,
  clearAdminToken,
  compressPoster,
  formatCountdown,
  getAdminToken,
  uploadMedia,
  type StudentClass,
} from "@/lib/academy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Space — Hypnotism" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type AdminClass = {
  id: number;
  number: number;
  title: string;
  description: string;
  posterUrl: string | null;
  video_id: string | null;
};

type Student = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  age: number | null;
  status: string;
  registered_at: string;
  last_seen_at: string;
  done_count: number;
};

type Overview = { students: Student[]; classes: AdminClass[] };

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  suspended: "bg-orange-500/15 text-orange-200 border-orange-500/30",
  removed: "bg-red-500/15 text-red-300 border-red-500/30",
};

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"classes" | "students">("classes");
  const [editing, setEditing] = useState<AdminClass | "new" | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminToken()) void navigate({ to: "/admin-access", replace: true });
  }, [navigate]);

  const overview = useQuery({
    queryKey: ["admin-overview"],
    enabled: !!getAdminToken(),
    queryFn: () => adminCall<Overview>("overview"),
    retry: false,
  });

  useEffect(() => {
    if (overview.error) {
      toast.error(overview.error.message);
      if (!getAdminToken()) void navigate({ to: "/admin-access", replace: true });
    }
  }, [overview.error, navigate]);

  const students = overview.data?.students ?? [];
  const classes = overview.data?.classes ?? [];
  const pending = students.filter((s) => s.status === "pending").length;

  const logout = () => {
    clearAdminToken();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="grain" />
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={34} />
            <span className="font-display text-lg tracking-wide text-gold">ADMIN SPACE</span>
          </Link>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={logout}>
            <LogOut className="mr-1 size-4" /> Log out
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden hero-surface">
        <HypnoBackdrop rings={3} />
        <div className="relative mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
          <Stat label="Classes" value={classes.length} icon={<Film className="size-5" />} delay={0} />
          <Stat label="Students" value={students.length} icon={<Users className="size-5" />} delay={80} />
          <Stat label="Waiting approval" value={pending} icon={<Clock className="size-5" />} delay={160} />
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 inline-flex rounded-full border border-border bg-card p-1">
          {(["classes", "students"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-5 py-2 text-sm capitalize transition",
                tab === t ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
              {t === "students" && pending > 0 && (
                <span className="ml-2 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-black">{pending}</span>
              )}
            </button>
          ))}
        </div>

        {overview.isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-secondary/50" />
            ))}
          </div>
        )}

        {overview.data && tab === "classes" && (
          <ClassesPanel classes={classes} onEdit={setEditing} />
        )}
        {overview.data && tab === "students" && <StudentsPanel students={students} onOpen={setStudentId} />}
      </main>

      {editing && <ClassEditor initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {studentId && <StudentProfile studentId={studentId} onClose={() => setStudentId(null)} />}
    </div>
  );
}

function Stat({ label, value, icon, delay }: { label: string; value: number; icon: React.ReactNode; delay: number }) {
  return (
    <div className="animate-rise rounded-3xl surface-card p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between text-primary">{icon}</div>
      <p className="mt-4 font-display text-4xl text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------- Classes ---------------- */

function ClassesPanel({ classes, onEdit }: { classes: AdminClass[]; onEdit: (c: AdminClass | "new") => void }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

  const move = useMutation({
    mutationFn: (v: { id: number; direction: "up" | "down" }) => adminCall("moveClass", v),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: number) => adminCall("deleteClass", { id }),
    onSuccess: () => {
      toast.success("Class deleted");
      void refresh();
    },
  });

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <button
        onClick={() => onEdit("new")}
        className="group flex aspect-[4/5] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-primary/40 text-primary transition hover:border-primary hover:bg-primary/5"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 transition group-hover:scale-110 group-hover:rotate-90">
          <Plus className="size-8" />
        </span>
        <span className="font-display text-2xl">Add new class</span>
        <span className="text-xs text-muted-foreground">Poster + video from your gallery</span>
      </button>

      {classes.map((c, i) => (
        <Reveal key={c.id} delay={i * 70}>
          <div className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-border surface-card card-lift">
            {c.posterUrl && (
              <img src={c.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary backdrop-blur">
              Class {c.number}
            </span>
            <div className="absolute right-3 top-3 flex flex-col gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              <IconBtn label="Move up" disabled={i === 0} onClick={() => move.mutate({ id: c.id, direction: "up" })}>
                <ArrowUp className="size-4" />
              </IconBtn>
              <IconBtn label="Move down" disabled={i === classes.length - 1} onClick={() => move.mutate({ id: c.id, direction: "down" })}>
                <ArrowDown className="size-4" />
              </IconBtn>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="font-display text-2xl leading-tight">{c.title}</h3>
              {c.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => onEdit(c)}>
                  <Pencil className="mr-1 size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Delete "${c.title}"? Students lose this class and its progress.`)) remove.mutate(c.id);
                  }}
                >
                  <Trash2 className="mr-1 size-3.5" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-background/75 p-2 text-foreground/80 backdrop-blur transition hover:text-primary disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-md sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[94vh] w-full max-w-2xl animate-rise overflow-y-auto rounded-t-3xl border border-border surface-card p-6 sm:rounded-3xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="font-display text-3xl text-gold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted-foreground transition hover:rotate-90 hover:text-primary">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ClassEditor({ initial, onClose }: { initial: AdminClass | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [poster, setPoster] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(initial?.posterUrl ?? null);
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null);

  useEffect(() => {
    if (!poster) return;
    const url = URL.createObjectURL(poster);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [poster]);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Add a class title");
      if (!initial && (!poster || !video)) throw new Error("Choose a poster and a video");

      let posterId: string | undefined;
      let videoId: string | undefined;
      if (poster) {
        setProgress({ label: "Uploading poster", value: 0 });
        posterId = await uploadMedia(await compressPoster(poster), "poster", (v) =>
          setProgress({ label: "Uploading poster", value: v }),
        );
      }
      if (video) {
        setProgress({ label: "Uploading video", value: 0 });
        videoId = await uploadMedia(video, "video", (v) => setProgress({ label: "Uploading video", value: v }));
      }
      setProgress({ label: "Saving", value: 1 });
      await adminCall("saveClass", { id: initial?.id, title, description, posterId, videoId });
    },
    onSuccess: async () => {
      toast.success(initial ? "Class updated" : "Class added");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      onClose();
    },
    onError: (e) => {
      setProgress(null);
      toast.error(e instanceof Error ? e.message : "Unable to save class");
    },
  });

  return (
    <Sheet title={initial ? "Edit class" : "Add new class"} onClose={save.isPending ? () => {} : onClose}>
      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <label className="group relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 text-center text-xs text-muted-foreground transition hover:border-primary">
          {posterPreview ? (
            <img src={posterPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <ImagePlus className="size-8 text-primary transition group-hover:scale-110" />
              Choose poster
            </>
          )}
          {posterPreview && (
            <span className="absolute inset-x-2 bottom-2 rounded-full bg-background/80 py-1 text-[11px] text-foreground opacity-0 backdrop-blur transition group-hover:opacity-100">
              Change poster
            </span>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setPoster(e.target.files?.[0] ?? null)} />
        </label>

        <div className="space-y-4">
          <Input placeholder="Class title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
          <Textarea
            placeholder="Short description (optional)"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-primary/40 p-4 transition hover:border-primary">
            <Film className="size-6 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 text-sm">
              {video ? (
                <span className="block truncate text-foreground">{video.name}</span>
              ) : initial?.video_id ? (
                <span className="text-muted-foreground">Video uploaded — tap to replace</span>
              ) : (
                <span className="text-muted-foreground">Choose video from gallery</span>
              )}
              {video && <span className="text-xs text-muted-foreground">{(video.size / 1024 / 1024).toFixed(1)} MB</span>}
            </span>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      {progress && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.label}…</span>
            <span>{Math.round(progress.value * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progress.value * 100}%`, background: "var(--gradient-gold)" }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Keep this screen open until the upload finishes.</p>
        </div>
      )}

      <div className="mt-8 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Uploading…" : initial ? "Save changes" : "Add class"}
        </Button>
      </div>
    </Sheet>
  );
}

/* ---------------- Students ---------------- */

function StudentsPanel({ students, onOpen }: { students: Student[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = students.filter((s) =>
    `${s.full_name ?? ""} ${s.email} ${s.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search students" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      {list.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No students yet. Students appear here after they register and open their classes page.
        </div>
      )}
      <div className="grid gap-3">
        {list.map((s, i) => (
          <Reveal key={s.id} delay={Math.min(i, 10) * 40}>
            <button
              onClick={() => onOpen(s.id)}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 text-left transition hover:border-primary/50 hover:bg-card"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-lg text-primary">
                {(s.full_name || s.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.full_name || "Unnamed student"}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{s.done_count} done</span>
              <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] capitalize", STATUS_STYLE[s.status])}>{s.status}</span>
            </button>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function StudentProfile({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin-student", studentId],
    queryFn: () => adminCall<{ student: Student; classes: StudentClass[]; serverNow: number }>("student", { studentId }),
  });
  const now = useNow(detail.data ? detail.data.serverNow - Date.now() : 0);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-student", studentId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const status = useMutation({
    mutationFn: (value: string) => adminCall("setStatus", { studentId, status: value }),
    onSuccess: async (_d, value) => {
      toast.success(`Student ${value}`);
      await refresh();
    },
  });
  const access = useMutation({
    mutationFn: (v: { classId: number; mode: "unlock" | "lock" | "auto" | "reset" | "done" }) =>
      adminCall("setAccess", { studentId, ...v }),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => adminCall("deleteStudent", { studentId }),
    onSuccess: async () => {
      toast.success("Student deleted");
      await refresh();
      onClose();
    },
  });

  const s = detail.data?.student;

  return (
    <Sheet title={s?.full_name || s?.email || "Student"} onClose={onClose}>
      {!s && <div className="h-40 animate-pulse rounded-2xl bg-secondary/50" />}
      {s && (
        <>
          <div className="grid gap-2 rounded-2xl border border-border bg-secondary/30 p-4 text-sm sm:grid-cols-2">
            <Field label="Email" value={s.email} />
            <Field label="Phone" value={s.phone} />
            <Field label="WhatsApp" value={s.whatsapp} />
            <Field label="Age" value={s.age?.toString() ?? null} />
            <Field label="Registered" value={new Date(s.registered_at).toLocaleString()} />
            <Field label="Last seen" value={new Date(s.last_seen_at).toLocaleString()} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs capitalize", STATUS_STYLE[s.status])}>{s.status}</span>
            <span className="flex-1" />
            {s.status !== "approved" && (
              <Button size="sm" onClick={() => status.mutate("approved")}>
                <CheckCircle2 className="mr-1 size-4" /> Approve
              </Button>
            )}
            {s.status !== "suspended" && (
              <Button size="sm" variant="secondary" onClick={() => status.mutate("suspended")}>
                Suspend
              </Button>
            )}
            {s.status !== "pending" && (
              <Button size="sm" variant="ghost" onClick={() => status.mutate("pending")}>
                Set pending
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => window.confirm("Delete this student and their progress?") && remove.mutate()}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <h3 className="mt-8 font-display text-2xl">Classes</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlock opens a class right away. Lock hides it. Auto follows the 24-hour rule.
          </p>
          <div className="mt-4 space-y-3">
            {detail.data!.classes.length === 0 && <p className="text-sm text-muted-foreground">No classes added yet.</p>}
            {detail.data!.classes.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {c.posterUrl ? (
                    <img src={c.posterUrl} alt="" className="h-14 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-14 w-11 shrink-0 rounded-lg bg-secondary" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.position}. {c.title}
                    </p>
                    <StateLabel item={c} now={now} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.state === "done" ? (
                    <Button size="sm" variant="ghost" onClick={() => access.mutate({ classId: c.id, mode: "reset" })}>
                      <RotateCcw className="mr-1 size-3.5" /> Reset
                    </Button>
                  ) : (
                    (c.state === "open" || c.adminUnlocked) && (
                      <Button size="sm" variant="ghost" title="Mark done and open the next class now" onClick={() => access.mutate({ classId: c.id, mode: "done" })}>
                        <Wand2 className="mr-1 size-3.5" /> Mark done
                      </Button>
                    )
                  )}
                  {!c.adminUnlocked && (
                    <Button size="sm" onClick={() => access.mutate({ classId: c.id, mode: "unlock" })}>
                      <Unlock className="mr-1 size-3.5" /> Unlock
                    </Button>
                  )}
                  {!c.adminLocked && (
                    <Button size="sm" variant="secondary" onClick={() => access.mutate({ classId: c.id, mode: "lock" })}>
                      <Lock className="mr-1 size-3.5" /> Lock
                    </Button>
                  )}
                  {(c.adminUnlocked || c.adminLocked) && (
                    <Button size="sm" variant="ghost" onClick={() => access.mutate({ classId: c.id, mode: "auto" })}>
                      Auto
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="truncate text-foreground/90">{value || "—"}</p>
    </div>
  );
}

function StateLabel({ item, now }: { item: StudentClass; now: number }) {
  const extra = item.adminUnlocked ? " · unlocked by admin" : item.adminLocked ? " · locked by admin" : "";
  const map: Record<string, string> = {
    open: "Open",
    done: "Done",
    locked: "Locked",
    countdown: item.unlockAt ? `Opens in ${formatCountdown(item.unlockAt - now)}` : "Waiting",
  };
  return (
    <p className={cn("text-xs", item.state === "done" || item.state === "open" ? "text-primary" : "text-muted-foreground")}>
      {map[item.state]}
      {extra}
    </p>
  );
}
