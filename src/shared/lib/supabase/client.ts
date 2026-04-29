import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/shared/lib/supabase/env";
import { isDemoMode } from "@/shared/lib/demoMode";
import { createDemoMockSupabaseClient } from "@/shared/lib/supabase/demoMockClient";

/** Eine Instanz pro Tab — vermeidet parallele Auth-Locks („stole it") bei mehrfachen createBrowserClient(). */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let demoBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Demo-Mode: Mock-Client (verhindert dass useUser/Auth-Hooks im Browser crashen).
  if (isDemoMode()) {
    if (!demoBrowserClient) {
      demoBrowserClient = createDemoMockSupabaseClient() as ReturnType<typeof createBrowserClient>;
    }
    return demoBrowserClient;
  }

  assertSupabasePublicEnv();
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
