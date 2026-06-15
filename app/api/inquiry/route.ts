import { getAdmin } from '@/lib/supabase/admin'
import { sendInquiryEmail } from '@/lib/resend'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 })

  const { name = '', company = '', phone = '', email = '', message = '', modules } =
    body as Record<string, string | string[] | undefined>

  if (!name || !email || !message) {
    return Response.json({ error: 'Trūkst: vārds, e-pasts, ziņa' }, { status: 400 })
  }

  const sb = getAdmin()
  const { error } = await sb.from('module_inquiries').insert({
    name,
    company,
    phone,
    email,
    message,
    modules: Array.isArray(modules) ? modules : [],
  })
  if (error) console.error('[inquiry insert]', error.message)

  await sendInquiryEmail({
    name:    name    as string,
    company: company as string,
    phone:   phone   as string,
    email:   email   as string,
    message: message as string,
    modules: Array.isArray(modules) ? modules : undefined,
  })

  return Response.json({ ok: true })
}
