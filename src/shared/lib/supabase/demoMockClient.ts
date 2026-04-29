/**
 * Mock-Supabase-Client für den Demo-Mode.
 *
 * Verhindert dass API-Routen crashen wenn sie `createClient()` oder
 * `createAdminClient()` aufrufen aber kein echtes Supabase angebunden ist.
 *
 * Verhalten:
 *  - `.auth.getUser()` → liefert den Demo-User (eingeloggt)
 *  - `.auth.getSession()` → liefert eine fake Session
 *  - `.from(table)...` Query-Chains → liefern `{ data: null, error: null }` (graceful empty)
 *  - Mutationen (insert/update/upsert/delete) → ebenfalls `{ data: null, error: null }`
 *
 * UI-Komponenten interpretieren `data: null` typischerweise als "keine Daten" und zeigen
 * einen Empty-State. Crashs werden so vermieden.
 */

import { DEMO_USER } from "@/shared/lib/demoMode";

const DEMO_SESSION = {
  access_token: "demo-access-token",
  refresh_token: "demo-refresh-token",
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  token_type: "bearer",
  user: {
    id: DEMO_USER.id,
    email: DEMO_USER.email,
    role: "authenticated",
    aud: "authenticated",
    app_metadata: { provider: "demo", role: "owner" },
    user_metadata: { full_name: DEMO_USER.fullName, role: "owner" },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

const DEMO_SUPABASE_USER = DEMO_SESSION.user;

/**
 * Erzeugt einen Query-Builder dessen jeder chained call wiederum den Builder zurückgibt,
 * und der bei terminalen Calls (then, await, .single etc.) ein leeres Result liefert.
 */
function createMockQueryBuilder(): unknown {
  // Symbol/Methods that return the result instead of `this`.
  const TERMINATORS = new Set([
    "single",
    "maybeSingle",
    "csv",
    "geojson",
    "explain",
  ]);

  // Promise-like result for `await`-bare query.
  const RESULT_OK = { data: null, error: null, count: null, status: 200, statusText: "OK" };
  const RESULT_OK_LIST = { data: [], error: null, count: 0, status: 200, statusText: "OK" };

  function makeBuilder(): unknown {
    const builder: Record<string | symbol, unknown> = {};

    // .then macht den Builder Promise-like
    builder.then = (
      onFulfilled?: (value: typeof RESULT_OK_LIST) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(RESULT_OK_LIST).then(onFulfilled, onRejected);

    builder.catch = (onRejected: (reason: unknown) => unknown) =>
      Promise.resolve(RESULT_OK_LIST).catch(onRejected);

    builder.finally = (onFinally: () => void) =>
      Promise.resolve(RESULT_OK_LIST).finally(onFinally);

    return new Proxy(builder, {
      get(target, prop) {
        if (prop in target) return target[prop as string];
        const propStr = String(prop);
        if (TERMINATORS.has(propStr)) {
          return () => Promise.resolve(RESULT_OK);
        }
        // Alle anderen Methoden geben den Builder zurück (chain).
        return () => makeBuilder();
      },
    });
  }

  return makeBuilder();
}

/** Public: Mock-Supabase-Client (deckt das Wesentliche ab). */
export function createDemoMockSupabaseClient(): unknown {
  return {
    auth: {
      getUser: async () => ({ data: { user: DEMO_SUPABASE_USER }, error: null }),
      getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: DEMO_SUPABASE_USER, session: DEMO_SESSION },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
      admin: {
        createUser: async () => ({ data: { user: DEMO_SUPABASE_USER }, error: null }),
        deleteUser: async () => ({ data: null, error: null }),
        listUsers: async () => ({ data: { users: [] }, error: null }),
        updateUserById: async () => ({ data: { user: DEMO_SUPABASE_USER }, error: null }),
        getUserById: async () => ({ data: { user: DEMO_SUPABASE_USER }, error: null }),
        inviteUserByEmail: async () => ({ data: { user: DEMO_SUPABASE_USER }, error: null }),
      },
    },
    from: () => createMockQueryBuilder(),
    rpc: () => Promise.resolve({ data: null, error: null }),
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: "demo/file" }, error: null }),
        download: async () => ({ data: null, error: null }),
        remove: async () => ({ data: [], error: null }),
        list: async () => ({ data: [], error: null }),
        createSignedUrl: async () => ({
          data: { signedUrl: "https://demo.invalid/file" },
          error: null,
        }),
        getPublicUrl: () => ({ data: { publicUrl: "https://demo.invalid/file" } }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => undefined }) }),
      subscribe: () => ({ unsubscribe: () => undefined }),
      unsubscribe: () => undefined,
    }),
    removeChannel: () => undefined,
  };
}
