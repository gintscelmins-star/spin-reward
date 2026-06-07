'use server'

import { sendSms } from '@/lib/twilio'

export async function sendPrizeSms(
  token: string,
  phone: string,
  origin: string
): Promise<{ ok: boolean; error?: string }> {
  const link = `${origin}/prize/${token}`
  try {
    await sendSms(phone, `Tava balva: ${link}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
