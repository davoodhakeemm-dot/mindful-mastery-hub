import { supabase } from "@/integrations/supabase/client";

const FN = "/.netlify/functions";
const ADMIN_TOKEN_KEY = "hypnotism-admin-token";
const CHUNK_SIZE = 3 * 1024 * 1024;

export type ClassState = "open" | "done" | "countdown" | "locked";

export type StudentClass = {
  id: number;
  title: string;
  description: string;
  position: number;
  posterUrl: string | null;
  hasVideo: boolean;
  state: ClassState;
  unlockAt: number | null;
  doneAt: number | null;
  adminUnlocked: boolean;
  adminLocked: boolean;
};

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

/* ---------- Student ---------- */

async function studentHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type StudentOverview =
  | { registered: false }
  | {
      registered: true;
      status: string;
      fullName: string | null;
      serverNow: number;
      classes: StudentClass[];
    };

export async function fetchMyClasses() {
  const res = await fetch(`${FN}/student`, { headers: await studentHeaders() });
  return handle<StudentOverview>(res);
}

export async function studentAction<T = { ok: true }>(action: "done" | "watch", classId: number) {
  const res = await fetch(`${FN}/student`, {
    method: "POST",
    headers: { ...(await studentHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ action, classId }),
  });
  return handle<T>(res);
}

/* ---------- Admin ---------- */

export const getAdminToken = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(ADMIN_TOKEN_KEY);

export const clearAdminToken = () => window.localStorage.removeItem(ADMIN_TOKEN_KEY);

export async function adminLogin(key: string) {
  const res = await fetch(`${FN}/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", key }),
  });
  const { token } = await handle<{ token: string }>(res);
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export async function adminCall<T = { ok: true }>(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(`${FN}/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken() ?? ""}` },
    body: JSON.stringify({ action, ...payload }),
  });
  if (res.status === 401) clearAdminToken();
  return handle<T>(res);
}

/** Shrinks a gallery photo so posters load fast everywhere. */
export async function compressPoster(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Uploads a file in pieces and returns its media id. */
export async function uploadMedia(
  file: Blob,
  kind: "poster" | "video",
  onProgress?: (fraction: number) => void,
) {
  const id = crypto.randomUUID();
  const chunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const auth = { Authorization: `Bearer ${getAdminToken() ?? ""}` };

  for (let i = 0; i < chunks; i++) {
    const part = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    let attempt = 0;
    for (;;) {
      const res = await fetch(`${FN}/upload?id=${id}&index=${i}`, {
        method: "PUT",
        headers: { ...auth, "Content-Type": "application/octet-stream" },
        body: part,
      });
      if (res.ok) break;
      if (++attempt >= 3) await handle(res);
    }
    onProgress?.((i + 1) / chunks);
  }

  const res = await fetch(`${FN}/upload?id=${id}&finish=1`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ chunks, size: file.size, contentType: file.type, kind }),
  });
  await handle(res);
  return id;
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
