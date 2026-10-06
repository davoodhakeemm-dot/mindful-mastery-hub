import { fail, isUuid, mediaStore, verifyToken } from "../lib/core.js";

type Meta = { kind: "poster" | "video"; contentType: string; size: number; chunks: number; chunkSize: number };

/**
 * Serves uploaded class media. Posters are public (shown on locked class cards);
 * videos need a short-lived token issued to a student whose class is unlocked.
 * Supports HTTP Range so videos can stream and seek.
 */
export default async (req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!isUuid(id)) return fail("Not found", 404);

  const store = mediaStore();
  const meta = (await store.get(`meta/${id}`, { type: "json" })) as Meta | null;
  if (!meta) return fail("Not found", 404);

  if (meta.kind === "video") {
    const token = await verifyToken(url.searchParams.get("t"));
    if (token?.role !== "video" || token.media !== id) return fail("Locked", 403);
  }

  const range = req.headers.get("range");
  let start = 0;
  let end = meta.size - 1;
  const match = range?.match(/bytes=(\d*)-(\d*)/);
  if (match) {
    if (match[1]) start = Number(match[1]);
    else if (match[2]) start = Math.max(0, meta.size - Number(match[2]));
    if (match[1] && match[2]) end = Math.min(Number(match[2]), meta.size - 1);
  }
  if (start >= meta.size) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${meta.size}` } });
  }

  // Answer one stored chunk at a time; the browser requests the rest as it plays.
  const chunkIndex = Math.floor(start / meta.chunkSize);
  const chunkStart = chunkIndex * meta.chunkSize;
  end = Math.min(end, chunkStart + meta.chunkSize - 1);

  const chunk = (await store.get(`chunk/${id}/${chunkIndex}`, { type: "arrayBuffer" })) as ArrayBuffer | null;
  if (!chunk) return fail("Not found", 404);
  const part = chunk.slice(start - chunkStart, end - chunkStart + 1);

  const headers: Record<string, string> = {
    "Content-Type": meta.contentType,
    "Accept-Ranges": "bytes",
    "Content-Length": String(part.byteLength),
    "Cache-Control": meta.kind === "poster" ? "public, max-age=86400" : "private, no-store",
  };

  const whole = start === 0 && end === meta.size - 1;
  if (!range && whole) return new Response(part, { status: 200, headers });
  headers["Content-Range"] = `bytes ${start}-${start + part.byteLength - 1}/${meta.size}`;
  return new Response(part, { status: 206, headers });
};
