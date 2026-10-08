"use server";

import { createClient } from "@/lib/supabase/server";

export interface ClientHit {
  id: string;
  name: string;
  client_type: string;
  cnic: string | null;
  ntn: string | null;
  phone: string | null;
  city: string | null;
}

/** Fast client search by name, CNIC, NTN, STRN or phone. */
export async function searchClients(query: string, limit = 8): Promise<ClientHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  // PostgREST "or" syntax treats , ( ) as separators: keep only safe characters.
  const text = q.replace(/[^\p{L}\p{N} .&'-]/gu, "").trim();
  let digits = q.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) digits = "0" + digits.slice(2); // +92 300… -> 0300…
  const filters: string[] = [];
  if (text) filters.push(`name.ilike.*${text}*`);
  if (digits.length >= 4) filters.push(`search_digits.like.*${digits}*`);
  if (filters.length === 0) return [];
  const { data } = await supabase
    .from("clients")
    .select("id, name, client_type, cnic, ntn, phone, city")
    .is("deleted_at", null)
    .or(filters.join(","))
    .order("name")
    .limit(limit);
  return data ?? [];
}
