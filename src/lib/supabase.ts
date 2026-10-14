import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurationError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. See README for setup.'
    : null

export const supabase = createClient(
  supabaseUrl || 'https://configuration.invalid',
  supabaseAnonKey || 'missing-configuration',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
