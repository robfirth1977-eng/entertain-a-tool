import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hhwrfssjihchofutiujs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod3Jmc3NqaWhjaG9mdXRpdWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzU2NjAsImV4cCI6MjA4OTUxMTY2MH0.U8JlleX48E4EvDriGIN10T8N9LDk457abSKyu9jgjks'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)