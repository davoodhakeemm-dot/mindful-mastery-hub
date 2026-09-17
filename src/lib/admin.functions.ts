import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;

/**
 * Verifies the hidden admin access key. The key lives only in a server secret,
 * never in client code, and is NOT the security boundary: an authenticated
 * session plus an admin role row is still required for every admin operation.
 */
export const verifyAdminKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => z.object({ key: z.string().max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
      .from("admin_key_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("success", false)
      .gte("created_at", since);

    if ((count ?? 0) >= MAX_FAILURES) {
      return { ok: false, lockedOut: true, isAdmin: false } as const;
    }

    const expected = process.env["ADMIN_ACCESS_KEY"] ?? "";
    const ok = expected.length > 0 && data.key.trim() === expected;

    await supabaseAdmin.from("admin_key_attempts").insert({
      user_id: context.userId,
      fingerprint: "server",
      success: ok,
    });

    if (!ok) return { ok: false, lockedOut: false, isAdmin: false } as const;

    // Owner bootstrap: if no admin exists yet, the first correct key claims the role.
    const { count: adminCount } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((adminCount ?? 0) === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
      return { ok: true, lockedOut: false, isAdmin: true } as const;
    }

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    return { ok: true, lockedOut: false, isAdmin: !!role } as const;
  });
