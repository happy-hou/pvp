import { createClient } from '@supabase/supabase-js'

// Supabase 配置 - anon key 是公开的，可以安全地硬编码
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://grmkuxuyxgxnlyecupwc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nUQ5ueyV6db7Iz4W1uAPew_AGCpmS3P'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
