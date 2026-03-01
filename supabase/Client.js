import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zntzvkohrwficznfufmg.supabase.co'
const supabaseKey = 'sb_publishable_ew1uTQZ-A5UJEwuKSKLpCw_hXVBL2up'

export const supabase = createClient(supabaseUrl, supabaseKey)