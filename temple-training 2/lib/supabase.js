import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://laqlbhzdanjcumncapyy.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhcWxiaHpkYW5qY3VtbmNhcHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTc5MDEsImV4cCI6MjA5NjE3MzkwMX0.eO7BG1kNdRGbYbRgNZbF-nj1Y7Zr9w32x7FOiX_qzks'

export const supabase = createClient(supabaseUrl, supabaseKey)
