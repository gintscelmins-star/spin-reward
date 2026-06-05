'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/supabase/admin'

// ---- Guard ---- every action must call this first
async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('403')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') throw new Error('403')
}

// ---- createVenue ----
export async function createVenue(formData: FormData) {
  await assertSuperAdmin()

  const name = (formData.get('name') as string).trim()
  const slug = (formData.get('slug') as string).trim().toLowerCase()
  const google_place_id = (formData.get('google_place_id') as string).trim() || null
  const plan = formData.get('plan') as string
  const seats = parseInt(formData.get('seats') as string, 10)

  const { data, error } = await getAdmin()
    .from('venues')
    .insert({ name, slug, google_place_id, plan, seats, active: true, billing_status: 'trial' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  redirect(`/admin/venues/${data.id}`)
}

// ---- updateVenue ----
export async function updateVenue(id: string, formData: FormData) {
  await assertSuperAdmin()

  const name = (formData.get('name') as string).trim()
  const slug = (formData.get('slug') as string).trim().toLowerCase()
  const google_place_id = (formData.get('google_place_id') as string).trim() || null
  const plan = formData.get('plan') as string
  const seats = parseInt(formData.get('seats') as string, 10)
  const billing_status = formData.get('billing_status') as string
  const active = formData.get('active') === 'true'

  const { error } = await getAdmin()
    .from('venues')
    .update({ name, slug, google_place_id, plan, seats, billing_status, active })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/venues/${id}`)
  revalidatePath('/admin/venues')
  redirect(`/admin/venues/${id}`)
}

// ---- toggleVenueActive ----
export async function toggleVenueActive(formData: FormData) {
  await assertSuperAdmin()

  const id = formData.get('id') as string
  const active = formData.get('active') === 'true'

  const { error } = await getAdmin()
    .from('venues')
    .update({ active })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/venues')
}

// ---- assignClientAdmin ----
interface AssignState {
  tempPassword?: string
  error?: string
}

export async function assignClientAdmin(
  _prevState: AssignState | null,
  formData: FormData
): Promise<AssignState> {
  await assertSuperAdmin()

  const venueId = formData.get('venueId') as string
  const email = (formData.get('email') as string).trim()

  if (!email || !venueId) return { error: 'E-pasts un venue ir obligāti' }

  // Temp password: 8 random chars + fixed suffix to satisfy complexity requirements
  const tempPassword = crypto.randomUUID().slice(0, 8) + 'Aa1!'

  const { data: authData, error: createError } = await getAdmin().auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (createError) return { error: createError.message }

  const { error: profileError } = await getAdmin()
    .from('profiles')
    .update({ role: 'client_admin', venue_id: venueId })
    .eq('id', authData.user.id)

  if (profileError) return { error: profileError.message }

  revalidatePath(`/admin/venues/${venueId}`)
  return { tempPassword }
}

// ---- resetClientAdminPassword ----
interface ResetPasswordState {
  tempPassword?: string
  error?: string
}

export async function resetClientAdminPassword(
  _prevState: ResetPasswordState | null,
  formData: FormData
): Promise<ResetPasswordState> {
  await assertSuperAdmin()

  const userId = formData.get('userId') as string
  const tempPassword = crypto.randomUUID().slice(0, 8) + 'Aa1!'

  const { error } = await getAdmin().auth.admin.updateUserById(userId, {
    password: tempPassword,
  })

  if (error) return { error: error.message }
  return { tempPassword }
}

// ---- deleteClientAdmin ----
export async function deleteClientAdmin(formData: FormData): Promise<void> {
  await assertSuperAdmin()

  const userId = formData.get('userId') as string
  const venueId = formData.get('venueId') as string

  await getAdmin().auth.admin.deleteUser(userId)

  revalidatePath(`/admin/venues/${venueId}`)
}
