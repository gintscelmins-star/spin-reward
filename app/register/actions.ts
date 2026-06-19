'use server'

import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type RegisterState = { error?: string } | null

export async function registerUser(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email     = (formData.get('email')     as string).trim().toLowerCase()
  const password  = (formData.get('password')  as string)
  const full_name = (formData.get('full_name') as string).trim()

  // Basic validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Nepareizs e-pasta formāts' }
  }
  if (!password || password.length < 8) {
    return { error: 'Parole pārāk īsa (min. 8 rakstzīmes)' }
  }
  if (!full_name) {
    return { error: 'Lūdzu ievadiet vārdu un uzvārdu' }
  }

  const admin = getAdmin()

  // Rate-limit check: ≤2 attempts in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('registration_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= 3) {
    return { error: 'Pārāk daudz mēģinājumu. Mēģiniet vēlāk.' }
  }

  // Create confirmed auth user via admin client
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.toLowerCase().includes('already')) {
      return { error: 'E-pasts jau reģistrēts' }
    }
    return { error: `Kļūda reģistrācijas laikā: ${authError.message}` }
  }

  const userId = authData.user.id

  // Insert profile
  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: userId, role: 'client_admin', full_name })

  if (profileError) {
    // Clean up auth user if profile insert failed
    await admin.auth.admin.deleteUser(userId)
    return { error: `Kļūda reģistrācijas laikā: ${profileError.message}` }
  }

  // Record registration attempt
  await admin.from('registration_attempts').insert({ email })

  // Sign the user in with the server client so cookies are set
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return { error: `Kļūda pieslēgšanās laikā: ${signInError.message}` }
  }

  redirect('/onboarding/venue')
}
