import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { readFileSync, unlinkSync, existsSync } from 'fs'

export default async function globalTeardown() {
  if (!existsSync('tests/e2e/.ctx.json')) return
  const ctx = JSON.parse(readFileSync('tests/e2e/.ctx.json', 'utf-8'))
  unlinkSync('tests/e2e/.ctx.json')

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  // CASCADE deletes everything linked to this venue
  await svc.from('venues').delete().eq('id', ctx.venueId)
}
