import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import HttpError from '../utils/httpError';

let client: SupabaseClient<Database> | undefined;

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || url.includes('your-project-ref') || key.includes('replace_with')) {
    throw new Error('Please set SUPABASE_URL and SUPABASE_SECRET_KEY in your server .env or Render environment variables.');
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export function throwDatabaseError(error: { code?: string; message: string }): never {
  console.error('[Supabase]', error.code ?? 'request', error.message);
  throw new HttpError(503, 'Supabase DB request failed.');
}