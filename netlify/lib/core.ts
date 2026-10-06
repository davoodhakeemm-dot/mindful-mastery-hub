import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-config.js";

export const ADMIN_KEY = "88678";
export const UNLOCK_DELAY_MS = 24 * 60 * 60 * 1000;
export const CHUNK_SIZE = 3 * 1024 * 1024;

let connection: ReturnType<typeof getDatabase> | undefined;
export const db = () => (connection ??= getDatabase());
export const mediaStore = () => getStore({ name: "class-media", consistency: "strong" });

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const fail = (message: string, status = 400) => json({ error: message }, status);

/* ---------- Signed tokens (HMAC-SHA256, secret stored in the database) ---------- */

let cachedSecret: CryptoKey | null = null;

async function signingKey(): Promise<CryptoKey> {
  if (cachedSecret) return cachedSecret;
  const { sql } = db();
  const fresh = crypto.randomUUID() + crypto.randomUUID();
  await sql`INSERT INTO app_settings (key, value) VALUES ('signing_secret', ${fresh}) ON CONFLICT (key) DO NOTHING`;
  const rows = await sql`SELECT value FROM app_settings WHERE key = 'signing_secret'`;
  const secret = String(rows[0]?.value ?? fresh);
  cachedSecret = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return cachedSecret;
}

const b64url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signToken(payload: Record<string, unknown>, ttlMs: number) {
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyToken(token: string | null | undefined): Promise<Record<string, any> | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const sigBytes = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const ok = await crypto.subtle.verify("HMAC", await signingKey(), sigBytes, new TextEncoder().encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const bearer = (req: Request) => req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;

export async function isAdmin(req: Request) {
  const payload = await verifyToken(bearer(req));
  return payload?.role === "admin";
}

/* ---------- Student identity (verified against Supabase Auth) ---------- */

export type StudentIdentity = { id: string; email: string; accessToken: string };

export async function getStudent(req: Request): Promise<StudentIdentity | null> {
  const token = bearer(req);
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string; email?: string };
  if (!user?.id) return null;
  return { id: user.id, email: (user.email ?? "").toLowerCase(), accessToken: token };
}

/** Reads the student's own registration profile from Supabase (allowed by RLS for the owner). */
export async function fetchOwnProfile(student: StudentIdentity) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(student.id)}&select=full_name,phone,whatsapp,age,status`,
    { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${student.accessToken}` } },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as any[];
  return rows[0] ?? null;
}

/* ---------- Class unlocking rules ---------- */

export type ClassRow = {
  id: number;
  title: string;
  description: string;
  position: number;
  poster_id: string | null;
  video_id: string | null;
};

export type StateRow = {
  class_id: number;
  done_at: string | Date | null;
  admin_unlocked: boolean;
  admin_locked: boolean;
};

export type ClassState = "open" | "done" | "countdown" | "locked";

/**
 * Class 1 is open for approved students. Every following class opens 24 hours after the
 * previous class is marked as done. Admin overrides (unlock / lock) always win.
 */
export function computeStates(classes: ClassRow[], states: StateRow[], now = Date.now()) {
  const byClass = new Map(states.map((s) => [s.class_id, s]));
  return classes.map((c, i) => {
    const row = byClass.get(c.id);
    const doneAt = row?.done_at ? new Date(row.done_at).getTime() : null;
    let state: ClassState;
    let unlockAt: number | null = null;

    if (row?.admin_locked) {
      state = "locked";
    } else if (row?.admin_unlocked || i === 0) {
      state = doneAt ? "done" : "open";
    } else {
      const prev = byClass.get(classes[i - 1]!.id);
      const prevDone = prev?.done_at ? new Date(prev.done_at).getTime() : null;
      if (prevDone) {
        unlockAt = prevDone + UNLOCK_DELAY_MS;
        state = now >= unlockAt ? (doneAt ? "done" : "open") : "countdown";
      } else {
        state = "locked";
      }
    }

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      position: i + 1,
      posterUrl: c.poster_id ? `/.netlify/functions/media?id=${c.poster_id}` : null,
      hasVideo: !!c.video_id,
      state,
      unlockAt: state === "countdown" ? unlockAt : null,
      doneAt,
      adminUnlocked: !!row?.admin_unlocked,
      adminLocked: !!row?.admin_locked,
    };
  });
}

export async function loadClasses(): Promise<ClassRow[]> {
  const { sql } = db();
  return (await sql`SELECT id, title, description, position, poster_id, video_id FROM classes ORDER BY position, id`) as ClassRow[];
}

export async function loadStates(studentId: string): Promise<StateRow[]> {
  const { sql } = db();
  return (await sql`
    SELECT class_id, done_at, admin_unlocked, admin_locked FROM student_classes WHERE student_id = ${studentId}
  `) as StateRow[];
}

export async function deleteMedia(id: string | null | undefined) {
  if (!id) return;
  const store = mediaStore();
  const meta = (await store.get(`meta/${id}`, { type: "json" })) as { chunks?: number } | null;
  const count = meta?.chunks ?? 0;
  await Promise.all(Array.from({ length: count }, (_, i) => store.delete(`chunk/${id}/${i}`)));
  await store.delete(`meta/${id}`);
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
