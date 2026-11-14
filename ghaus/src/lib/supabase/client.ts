import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Browser client. Only used for auth flows (sign-in, MFA); data goes through Server Components/Actions. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
