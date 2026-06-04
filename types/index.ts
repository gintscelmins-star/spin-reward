export type Venue = {
  id: string
  name: string
  slug: string
  google_place_id: string | null
  logo_url: string | null
  active: boolean
}

export type Prize = {
  id: string
  venue_id: string
  name: string
  description: string | null
  probability_weight: number
  expires_days: number
  active: boolean
}

export type Spin = {
  id: string
  venue_id: string
  prize_id: string
  qr_token: string
  status: string
  session_ref: string | null
  expires_at: string
}

export type Client = {
  id: string
  venue_id: string
  name: string
  phone: string
}
