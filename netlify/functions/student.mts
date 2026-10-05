import {
  computeStates,
  db,
  fail,
  fetchOwnProfile,
  getStudent,
  json,
  loadClasses,
  loadStates,
  signToken,
} from "../lib/core.js";

/**
 * Student API (signed-in students only).
 *  GET                         -> profile status + class list with lock/countdown state
 *  POST { action: "done" }     -> mark a class as done (starts the 24h countdown for the next class)
 *  POST { action: "watch" }    -> short-lived signed URL for an unlocked class video
 */
export default async (req: Request) => {
  const student = await getStudent(req);
  if (!student) return fail("Please sign in", 401);

  const { sql } = db();
  let [row] = await sql`SELECT id, status, full_name FROM students WHERE id = ${student.id}`;

  if (!row) {
    const profile = await fetchOwnProfile(student);
    if (!profile) return json({ registered: false });
    const status = profile.status === "approved" ? "approved" : "pending";
    [row] = await sql`
      INSERT INTO students (id, email, full_name, phone, whatsapp, age, status)
      VALUES (${student.id}, ${student.email}, ${profile.full_name ?? null}, ${profile.phone ?? null},
              ${profile.whatsapp ?? null}, ${profile.age ?? null}, ${status})
      ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()
      RETURNING id, status, full_name
    `;
  } else if (req.method === "GET") {
    await sql`UPDATE students SET last_seen_at = NOW() WHERE id = ${student.id}`;
  }

  const status = String(row!.status);
  const approved = status === "approved";
  const classes = computeStates(await loadClasses(), approved ? await loadStates(student.id) : []);

  if (req.method === "GET") {
    return json({
      registered: true,
      status,
      fullName: row!.full_name ?? null,
      serverNow: Date.now(),
      classes: approved
        ? classes
        : classes.map((c) => ({ ...c, state: "locked", unlockAt: null, doneAt: null })),
    });
  }

  if (req.method !== "POST") return fail("Method not allowed", 405);
  if (!approved) return fail("Your registration is waiting for approval", 403);

  const body = (await req.json().catch(() => ({}))) as { action?: string; classId?: number };
  const target = classes.find((c) => c.id === Number(body.classId));
  if (!target) return fail("Class not found", 404);
  if (target.state !== "open" && target.state !== "done") return fail("This class is still locked", 403);

  if (body.action === "done") {
    await sql`
      INSERT INTO student_classes (student_id, class_id, done_at)
      VALUES (${student.id}, ${target.id}, NOW())
      ON CONFLICT (student_id, class_id) DO UPDATE
        SET done_at = COALESCE(student_classes.done_at, NOW())
    `;
    return json({ ok: true });
  }

  if (body.action === "watch") {
    const [cls] = await sql`SELECT video_id FROM classes WHERE id = ${target.id}`;
    if (!cls?.video_id) return json({ videoUrl: null });
    const t = await signToken({ role: "video", media: cls.video_id }, 6 * 60 * 60 * 1000);
    return json({ videoUrl: `/.netlify/functions/media?id=${cls.video_id}&t=${encodeURIComponent(t)}` });
  }

  return fail("Unknown action");
};
