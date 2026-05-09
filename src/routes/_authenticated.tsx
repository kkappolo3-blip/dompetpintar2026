import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/finance/device";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Claim any device-scoped legacy data once per session
    const KEY = "dompet_claimed";
    if (!localStorage.getItem(KEY)) {
      const dev = getDeviceId();
      supabase.rpc("claim_device_data", { _device_id: dev }).then(() => {
        localStorage.setItem(KEY, "1");
      }).catch(() => {});
    }
    setReady(true);
  }, []);
  if (!ready) return null;
  return <Outlet />;
}