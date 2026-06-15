const API_KEY = process.env.RESEND_API_KEY ?? ''

export async function sendInquiryEmail(data: {
  name: string
  company: string
  phone: string
  email: string
  message: string
  modules?: string[]
}) {
  if (!API_KEY) {
    console.warn('[resend] RESEND_API_KEY nav iestatīts — e-pasts izlaists')
    return
  }
  const mods = data.modules?.length ? `\nModuļi: ${data.modules.join(', ')}` : ''
  const text = [
    'Jauns pieprasījums no spillit.lv\n',
    `Vārds: ${data.name}`,
    `Uzņēmums: ${data.company || '—'}`,
    `Telefons: ${data.phone || '—'}`,
    `E-pasts: ${data.email}`,
    `\nZiņa:\n${data.message}`,
    mods,
  ].join('\n')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      from: 'Spillit <noreply@spillit.lv>',
      to: ['gints@spillit.lv'],
      reply_to: data.email,
      subject: `Spillit pieprasījums — ${data.name} (${data.company || data.email})`,
      text,
    }),
  }).catch(e => console.error('[resend]', e))
}
