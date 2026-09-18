import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async ({ location }) => {
    // Allow the Admin Access page to open before normal login.
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

  component: () => <Outlet />,
});
