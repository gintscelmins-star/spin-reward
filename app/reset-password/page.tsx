import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './ResetPasswordForm'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Must have an active session (set by /auth/confirm verifyOtp)
  if (!user) redirect('/login?error=link_invalid')

  return <ResetPasswordForm />
}
