import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async ({ location }) => {
    // Admin Access is intentionally available before normal login.
    // The admin key itself is verified securely on the server.
    if (location.pathname === "/admin-access") {
      return;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw redirect({
        to: "/auth",
      });
    }

    return {
      user,
    };
  },

  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
