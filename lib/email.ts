const API_KEY = process.env.RESEND_API_KEY ?? ''

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
