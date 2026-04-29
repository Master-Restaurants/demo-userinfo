"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { isDemoMode } from "@/shared/lib/demoMode";

/**
 * Banner über dem Dashboard, der im Demo-Modus darauf hinweist dass alle
 * Daten fiktiv sind. Vom User per "X" wegblendbar (nur in der aktuellen Session).
 */
export function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoMode() || dismissed) return null;

  return (
    <div className="relative flex items-center justify-center gap-2 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-amber-950/40 dark:text-amber-200">
      <Sparkles className="h-4 w-4 flex-shrink-0" />
      <span className="text-center">
        <strong className="font-semibold">Demo-Modus.</strong> Alle Daten sind
        fiktiv. Schreib-Aktionen werden nicht persistiert. Diese Demo dient zur
        Anschauung des Master-Dashboards.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 rounded p-1 transition hover:bg-amber-200/50 dark:hover:bg-amber-800/30"
        aria-label="Banner ausblenden"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
