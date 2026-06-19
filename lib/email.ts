const API_KEY = process.env.RESEND_API_KEY ?? ''

async function sendEmail(payload: {
  to: string[]
  subject: string
  html?: string
  text?: string
}): Promise<void> {
  if (!API_KEY) {
    console.warn('[email] RESEND_API_KEY nav iestatīts — e-pasts izlaists')
    return
  }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Spillit <noreply@spillit.lv>',
      ...payload,
    }),
  }).catch(e => console.error('[resend] email error:', e))
}

export async function sendWelcomeEmail(
  to: string,
  venueName: string,
  dashboardUrl: string
): Promise<void> {
  await sendEmail({
    to: [to],
    subject: 'Laipni lūgti Spillit! 🎡',
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff">
  <div style="margin-bottom:32px">
    <span style="font-size:22px;font-weight:800;color:#7c3aed">🎡 Spillit</span>
  </div>
  <h1 style="font-size:22px;font-weight:700;color:#111;margin-bottom:12px">
    Laipni lūgti, ${venueName}!
  </h1>
  <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:8px">
    Jūsu laimes rats ir izveidots un gatavs darbam. Atveriet pārvaldības paneli,
    lai konfigurētu embed kodu un sāktu iesaistīt klientus.
  </p>
  <p style="color:#888;font-size:13px;margin-bottom:28px">
    Izmēģinājuma periods: <strong>14 dienas bez maksājuma kartītes</strong>.
  </p>
  <a href="${dashboardUrl}"
     style="display:inline-block;padding:14px 32px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">
    Atvērt pārvaldības paneli →
  </a>
  <hr style="border:none;border-top:1px solid #eee;margin:40px 0">
  <p style="color:#aaa;font-size:12px;line-height:1.6">
    Lai saņemtu embed kodu savai mājaslapai, dodieties uz:<br>
    <a href="${dashboardUrl}/widgets" style="color:#7c3aed;text-decoration:none">${dashboardUrl}/widgets</a>
  </p>
</div>
    `.trim(),
  })
}

export async function sendNewVenueNotification(
  venueName: string,
  ownerEmail: string,
  category: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'admin@spillit.lv'
  await sendEmail({
    to: [adminEmail],
    subject: `Jauna reģistrācija: ${venueName}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff">
  <h1 style="font-size:18px;font-weight:700;color:#111;margin-bottom:16px">
    Jauns uzņēmums reģistrēts
  </h1>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#888;width:130px">Nosaukums:</td><td style="padding:6px 0;color:#111;font-weight:600">${venueName}</td></tr>
    <tr><td style="padding:6px 0;color:#888">Īpašnieks:</td><td style="padding:6px 0;color:#111">${ownerEmail}</td></tr>
    <tr><td style="padding:6px 0;color:#888">Kategorija:</td><td style="padding:6px 0;color:#111">${category}</td></tr>
    <tr><td style="padding:6px 0;color:#888">Reģistrēts:</td><td style="padding:6px 0;color:#111">${new Date().toLocaleString('lv-LV')}</td></tr>
  </table>
</div>
    `.trim(),
  })
}

export async function sendDemoAccessEmail(to: string, magicLink: string) {
  if (!API_KEY) {
    console.warn('[email] RESEND_API_KEY nav iestatīts — demo e-pasts izlaists')
    console.log('[email] Magic link:', magicLink)
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.spillit.lv'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Spillit <noreply@spillit.lv>',
      to: [to],
      subject: 'Tavs Spillit demo pieejas saite',
      html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff">
  <div style="margin-bottom:32px">
    <span style="font-size:22px;font-weight:800;color:#7c3aed">spillit</span>
  </div>
  <h1 style="font-size:22px;font-weight:700;color:#111;margin-bottom:12px">Demo piekļuves saite</h1>
  <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:8px">
    Noklikšķini uz pogas zemāk, lai apskatītu Spillit admin paneļa demo versiju ar reālistiskiem datiem.
  </p>
  <p style="color:#888;font-size:13px;margin-bottom:28px">Saite ir derīga <strong>1 stundu</strong>.</p>
  <a href="${magicLink}"
     style="display:inline-block;padding:14px 32px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.01em">
    Atvērt demo →
  </a>
  <hr style="border:none;border-top:1px solid #eee;margin:40px 0">
  <p style="color:#aaa;font-size:12px;line-height:1.6">
    Ja tu neprasīji šo e-pastu — vienkārši ignorē to.<br>
    <a href="${appUrl}" style="color:#7c3aed;text-decoration:none">spillit.lv</a>
  </p>
</div>
      `.trim(),
    }),
  }).catch(e => console.error('[resend] demo access email error:', e))
}
