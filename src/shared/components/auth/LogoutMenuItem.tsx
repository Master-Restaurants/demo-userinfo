"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createClient } from "@/shared/lib/supabase/client";
import { useTranslation } from "@/i18n/I18nProvider";
import { isDemoMode } from "@/shared/lib/demoMode";

export function LogoutMenuItem() {
  const { t } = useTranslation();

  const handleLogout = async () => {
    if (isDemoMode()) {
      try {
        await fetch("/api/demo/logout", { method: "POST" });
      } catch {
        // ignore
      }
      window.location.assign("/login");
      return;
    }

    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore when auth provider is temporarily unreachable
    }
    try {
      await fetch("/api/dev/local-auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    window.location.assign("/login");
  };

  return (
    <DropdownMenuItem variant="destructive" onClick={handleLogout}>
      <LogOut className="h-4 w-4" />
      {t("auth.logout")}
    </DropdownMenuItem>
  );
}
