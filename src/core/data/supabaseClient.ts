/**
 * Supabase client configuration for AidGap
 * Creates and exports the Supabase client for data fetching
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Gets or creates the Supabase client
 * Returns null if Supabase is not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase not configured. Using static data mode.');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist session for demo
    },
  });

  return supabaseClient;
}

/**
 * Checks if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
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
