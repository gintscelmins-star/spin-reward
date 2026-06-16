import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    
    if (!token || typeof token !== 'string') {
      return Response.json(
        { error: 'Missing or invalid token' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('redeem_spin', {
      p_qr_token: token,
    })

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return Response.json(data)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
