import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://heseorbhzcmanfkxqkkg.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlc2VvcmJoemNtYW5ma3hxa2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4MzUwNiwiZXhwIjoyMDk2MTU5NTA2fQ.tBudUZ7T4DpG724Q2a7S1B8oLNqCOugX3RxaDVpa4wQ'
const VENUE_ID = 'a69edc53-8385-46ec-b24f-fc287a7a0e32' // Guns n Lasers

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// 1. Create auth user
const { data: user, error: createErr } = await admin.auth.admin.createUser({
  email: 'demo@spillit.lv',
  password: 'gunsnlasers',
  email_confirm: true,
})

if (createErr) {
  console.error('createUser error:', createErr)
  process.exit(1)
}

console.log('User created:', user.user.id)

// 2. Upsert profile
const { error: profileErr } = await admin
  .from('profiles')
  .upsert({
    id: user.user.id,
    role: 'client_admin',
    venue_id: VENUE_ID,
  })

if (profileErr) {
  console.error('profile upsert error:', profileErr)
  process.exit(1)
}

console.log('Profile set: client_admin @ Guns n Lasers')
console.log('Done! Login: demo@spillit.lv / gunsnlasers')
