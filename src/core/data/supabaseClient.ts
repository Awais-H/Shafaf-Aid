/**
 * Supabase client configuration for Shafaf
 * Creates and exports the Supabase client for data fetching and auth
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase client for use in the browser
 */
let browserClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client for use in the browser
 */
export function createBrowserClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase not configured. Using static data mode.');
    return null;
  }

  if (browserClient) return browserClient;

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/**
 * Creates a Supabase client for use in server components/actions
 * Note: Without @supabase/ssr, this won't automatically handle cookies.
 * For a full production app, we'd use @supabase/ssr.
 * For this implementation, we'll mostly rely on client-side auth
 * and pass tokens if needed, or use a basic client for data fetching.
 */
export function createServerClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Singleton client for legacy support (existing code)
 */
let legacyClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (legacyClient) return legacyClient;
  legacyClient = createBrowserClient();
  return legacyClient;
}

/**
 * Checks if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Gets the current data mode from environment
 */
export function getDataMode(): 'static' | 'supabase' {
  const mode = process.env.NEXT_PUBLIC_DATA_MODE;
  if (mode === 'supabase' && isSupabaseConfigured()) {
    return 'supabase';
  }
  return 'static';
}
