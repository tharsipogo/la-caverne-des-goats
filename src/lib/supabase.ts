import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ne bloque pas le build, mais avertit clairement en dev.
  console.warn(
    "⚠️ Variables Supabase manquantes. Copie .env.local.example en .env.local et remplis-le."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
