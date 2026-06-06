import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!url || !key || url.includes('PREENCHER')) {
  // Ajuda a perceber rapidinho se o .env.local não foi preenchido.
  console.warn(
    'Supabase: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local',
  )
}

export const supabase = createClient(url, key)
