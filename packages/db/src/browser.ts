"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { supabaseEnv } from "./env";

/** Supabase-klient for klientkomponenter. */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
