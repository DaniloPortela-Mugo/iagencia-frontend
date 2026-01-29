import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://eyiejzsinhdgqfkxgmdc.supabase.co';
const supabaseKey = 'sb_publishable_DHRU7SCknOz-2KcT1YyDXw_YYsPoTd6';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };