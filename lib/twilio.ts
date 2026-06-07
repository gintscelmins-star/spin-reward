const SID   = process.env.TWILIO_ACCOUNT_SID
const TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM  = process.env.TWILIO_PHONE_NUMBER

export const twilioConfigured = !!(SID && TOKEN && FROM)

export async function sendSms(to: string, body: string): Promise<void> {
  if (!SID || !TOKEN || !FROM) throw new Error('Twilio not configured')
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: FROM, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? `Twilio ${res.status}`)
  }
}
