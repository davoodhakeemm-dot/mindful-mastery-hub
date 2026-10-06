import { CHUNK_SIZE, fail, isAdmin, isUuid, json, mediaStore } from "../lib/core.js";

/**
 * Admin-only chunked upload for class posters and videos picked from the device gallery.
 *  PUT  ?id=<uuid>&index=<n>   raw chunk bytes (max CHUNK_SIZE)
 *  POST ?id=<uuid>&finish=1     { chunks, size, contentType, kind } -> stores the manifest
 */
export default async (req: Request) => {
  if (!(await isAdmin(req))) return fail("Admin access required", 401);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!isUuid(id)) return fail("Invalid upload id");
  const store = mediaStore();

  if (req.method === "PUT") {
    const index = Number(url.searchParams.get("index"));
    if (!Number.isInteger(index) || index < 0 || index > 5000) return fail("Invalid chunk index");
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > CHUNK_SIZE) return fail("Invalid chunk size");
    await store.set(`chunk/${id}/${index}`, bytes);
    return json({ ok: true });
  }

  if (req.method === "POST" && url.searchParams.get("finish")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, any>;
    const chunks = Number(body.chunks);
    const size = Number(body.size);
    const kind = body.kind === "video" ? "video" : "poster";
    const contentType = String(body.contentType || (kind === "video" ? "video/mp4" : "image/jpeg")).slice(0, 100);
    if (!Number.isInteger(chunks) || chunks < 1 || !Number.isFinite(size) || size < 1) return fail("Invalid manifest");
    await store.setJSON(`meta/${id}`, { kind, contentType, size, chunks, chunkSize: CHUNK_SIZE });
    return json({ ok: true, id });
  }

  return fail("Method not allowed", 405);
};
