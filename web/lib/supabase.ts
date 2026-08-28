import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lukxcysqwdlrttkxfrwb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4ffaTeNq6Jp1eVj7F89k6g_KynHXIF9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
