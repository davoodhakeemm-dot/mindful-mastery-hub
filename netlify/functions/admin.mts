import {
  ADMIN_KEY,
  computeStates,
  db,
  deleteMedia,
  fail,
  isAdmin,
  isUuid,
  json,
  loadClasses,
  loadStates,
  signToken,
} from "../lib/core.js";

const STATUSES = ["pending", "approved", "suspended", "removed"];

// Simple per-instance throttle against key guessing.
const failures = new Map<string, { count: number; until: number }>();

export default async (req: Request) => {
  if (req.method !== "POST") return fail("Method not allowed", 405);
  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const { sql } = db();

  if (body.action === "login") {
    const ip = req.headers.get("x-nf-client-connection-ip") ?? "unknown";
    const entry = failures.get(ip);
    if (entry && entry.until > Date.now()) return fail("Too many attempts. Try again in a few minutes.", 429);
    if (String(body.key ?? "").trim() !== ADMIN_KEY) {
      const count = (entry?.count ?? 0) + 1;
      failures.set(ip, { count, until: count >= 5 ? Date.now() + 10 * 60 * 1000 : 0 });
      return fail("Incorrect admin key", 401);
    }
    failures.delete(ip);
    return json({ token: await signToken({ role: "admin" }, 7 * 24 * 60 * 60 * 1000) });
  }

  if (!(await isAdmin(req))) return fail("Admin access required", 401);

  switch (body.action) {
    case "overview": {
      const students = await sql`
        SELECT s.id, s.email, s.full_name, s.phone, s.whatsapp, s.age, s.status, s.registered_at, s.last_seen_at,
               COUNT(sc.done_at)::int AS done_count
        FROM students s
        LEFT JOIN student_classes sc ON sc.student_id = s.id
        GROUP BY s.id
        ORDER BY s.registered_at DESC
      `;
      const classes = await loadClasses();
      return json({
        students,
        classes: classes.map((c, i) => ({
          ...c,
          number: i + 1,
          posterUrl: c.poster_id ? `/.netlify/functions/media?id=${c.poster_id}` : null,
        })),
      });
    }

    case "student": {
      const [student] = await sql`SELECT * FROM students WHERE id = ${String(body.studentId)}`;
      if (!student) return fail("Student not found", 404);
      const classes = computeStates(await loadClasses(), await loadStates(student.id));
      return json({ student, classes, serverNow: Date.now() });
    }

    case "setStatus": {
      if (!STATUSES.includes(body.status)) return fail("Invalid status");
      await sql`UPDATE students SET status = ${body.status} WHERE id = ${String(body.studentId)}`;
      return json({ ok: true });
    }

    case "setAccess": {
      // mode: "unlock" (open now), "lock" (block), "auto" (follow the 24h rule), "reset" (clear done)
      const studentId = String(body.studentId);
      const classId = Number(body.classId);
      const flags =
        body.mode === "unlock" ? { u: true, l: false } : body.mode === "lock" ? { u: false, l: true } : { u: false, l: false };
      if (body.mode === "reset") {
        await sql`UPDATE student_classes SET done_at = NULL WHERE student_id = ${studentId} AND class_id = ${classId}`;
      } else if (body.mode === "done") {
        await sql`
          INSERT INTO student_classes (student_id, class_id, done_at) VALUES (${studentId}, ${classId}, NOW() - INTERVAL '24 hours')
          ON CONFLICT (student_id, class_id) DO UPDATE SET done_at = NOW() - INTERVAL '24 hours'
        `;
      } else {
        await sql`
          INSERT INTO student_classes (student_id, class_id, admin_unlocked, admin_locked)
          VALUES (${studentId}, ${classId}, ${flags.u}, ${flags.l})
          ON CONFLICT (student_id, class_id) DO UPDATE SET admin_unlocked = ${flags.u}, admin_locked = ${flags.l}
        `;
      }
      return json({ ok: true });
    }

    case "deleteStudent": {
      await sql`DELETE FROM students WHERE id = ${String(body.studentId)}`;
      return json({ ok: true });
    }

    case "saveClass": {
      const title = String(body.title ?? "").trim().slice(0, 200);
      const description = String(body.description ?? "").trim().slice(0, 5000);
      if (!title) return fail("Class title is required");
      const posterId = isUuid(body.posterId) ? body.posterId : null;
      const videoId = isUuid(body.videoId) ? body.videoId : null;

      if (body.id) {
        const [existing] = await sql`SELECT poster_id, video_id FROM classes WHERE id = ${Number(body.id)}`;
        if (!existing) return fail("Class not found", 404);
        const nextPoster = posterId ?? existing.poster_id;
        const nextVideo = videoId ?? existing.video_id;
        await sql`
          UPDATE classes SET title = ${title}, description = ${description}, poster_id = ${nextPoster}, video_id = ${nextVideo}
          WHERE id = ${Number(body.id)}
        `;
        if (posterId && existing.poster_id && existing.poster_id !== posterId) await deleteMedia(existing.poster_id);
        if (videoId && existing.video_id && existing.video_id !== videoId) await deleteMedia(existing.video_id);
        return json({ ok: true });
      }

      if (!posterId || !videoId) return fail("Poster and video are required");
      const [{ next }] = (await sql`SELECT COALESCE(MAX(position), 0) + 1 AS next FROM classes`) as any[];
      await sql`
        INSERT INTO classes (title, description, position, poster_id, video_id)
        VALUES (${title}, ${description}, ${Number(next)}, ${posterId}, ${videoId})
      `;
      return json({ ok: true });
    }

    case "deleteClass": {
      const [existing] = await sql`DELETE FROM classes WHERE id = ${Number(body.id)} RETURNING poster_id, video_id`;
      if (existing) {
        await deleteMedia(existing.poster_id);
        await deleteMedia(existing.video_id);
      }
      return json({ ok: true });
    }

    case "moveClass": {
      const classes = await loadClasses();
      const index = classes.findIndex((c) => c.id === Number(body.id));
      const swapWith = index + (body.direction === "up" ? -1 : 1);
      if (index < 0 || swapWith < 0 || swapWith >= classes.length) return json({ ok: true });
      const ordered = [...classes];
      [ordered[index], ordered[swapWith]] = [ordered[swapWith]!, ordered[index]!];
      for (const [i, c] of ordered.entries()) {
        await sql`UPDATE classes SET position = ${i + 1} WHERE id = ${c.id}`;
      }
      return json({ ok: true });
    }

    default:
      return fail("Unknown action");
  }
};
