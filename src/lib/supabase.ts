import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const submissionTable = import.meta.env.VITE_SUPABASE_TABLE?.trim() || 'inspection_submissions'

export const supabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0

export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null