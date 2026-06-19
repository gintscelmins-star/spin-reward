import type { SupabaseClient } from '@supabase/supabase-js'

export interface StaffSummaryRow {
  staff_id: string
  sessions_count: number
  reviews_count: number
  avg_rating: number | null
  rating_1_count: number
  rating_2_count: number
  rating_3_count: number
  rating_4_count: number
  rating_5_count: number
  comment_count: number
}

export interface StaffReviewRow {
  session_date: string | null
  rating: number | null
  comment: string | null
  activity: string | null
}

function startOfDayUtc(dateStr: string) {
  return `${dateStr}T00:00:00Z`
}

function endOfDayUtc(dateStr: string) {
  return `${dateStr}T23:59:59.999Z`
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}

function ratingBucket(rating: number) {
  if (rating < 1.5) return 1
  if (rating < 2.5) return 2
  if (rating < 3.5) return 3
  if (rating < 4.5) return 4
  return 5
}

export async function getStaffSummaryRows(
  supabase: SupabaseClient,
  venueId: string,
  from: string,
  to: string
): Promise<StaffSummaryRow[]> {
  const fromTs = startOfDayUtc(from)
  const toTs = endOfDayUtc(to)

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('staff_id, rating, comment, session_id')
    .eq('venue_id', venueId)
    .gte('created_at', fromTs)
    .lte('created_at', toTs)

  if (error) throw new Error(error.message)

  const rows = new Map<
    string,
    StaffSummaryRow & { sessionIds: Set<string> }
  >()

  for (const review of reviews ?? []) {
    if (!review.staff_id) continue

    let row = rows.get(review.staff_id)
    if (!row) {
      row = {
        staff_id: review.staff_id,
        sessions_count: 0,
        reviews_count: 0,
        avg_rating: null,
        rating_1_count: 0,
        rating_2_count: 0,
        rating_3_count: 0,
        rating_4_count: 0,
        rating_5_count: 0,
        comment_count: 0,
        sessionIds: new Set<string>(),
      }
      rows.set(review.staff_id, row)
    }

    if (review.session_id) {
      row.sessionIds.add(review.session_id)
    }
    row.reviews_count += 1

    if (review.rating != null && !Number.isNaN(review.rating)) {
      const bucket = ratingBucket(review.rating)
      if (bucket === 1) row.rating_1_count += 1
      if (bucket === 2) row.rating_2_count += 1
      if (bucket === 3) row.rating_3_count += 1
      if (bucket === 4) row.rating_4_count += 1
      if (bucket === 5) row.rating_5_count += 1

      const existingAvg = row.avg_rating ?? 0
      const existingCount = row.rating_1_count + row.rating_2_count + row.rating_3_count + row.rating_4_count + row.rating_5_count
      row.avg_rating = roundToTenth((existingAvg * (existingCount - 1) + review.rating) / existingCount)
    }

    if (review.comment?.trim()) {
      row.comment_count += 1
    }
  }

  return Array.from(rows.values()).map(r => ({
    staff_id: r.staff_id,
    sessions_count: r.sessionIds.size,
    reviews_count: r.reviews_count,
    avg_rating: r.avg_rating,
    rating_1_count: r.rating_1_count,
    rating_2_count: r.rating_2_count,
    rating_3_count: r.rating_3_count,
    rating_4_count: r.rating_4_count,
    rating_5_count: r.rating_5_count,
    comment_count: r.comment_count,
  }))
}

export async function getStaffReviewsRows(
  supabase: SupabaseClient,
  venueId: string,
  staffId: string,
  from: string,
  to: string
): Promise<(StaffReviewRow & { session_id: string | null })[]> {
  const fromTs = startOfDayUtc(from)
  const toTs = endOfDayUtc(to)

  type ReviewRecord = {
    session_id: string | null
    rating: number | null
    comment: string | null
    activity?: { name?: string } | Array<{ name?: string }>
  }

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('session_id, rating, comment, activity:activity_id(name)')
    .eq('venue_id', venueId)
    .eq('staff_id', staffId)
    .gte('created_at', fromTs)
    .lte('created_at', toTs)
    .order('created_at', { ascending: false }) as {
      data: ReviewRecord[] | null
      error: { message: string } | null
    }

  if (error) throw new Error(error.message)

  const sessionIds = Array.from(
    new Set((reviews ?? []).map(r => r.session_id).filter(Boolean) as string[])
  )

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id, created_at')
    .in('id', sessionIds)

  if (sessionsError) throw new Error(sessionsError.message)

  const sessionById = new Map<string, string>()
  for (const session of sessions ?? []) {
    if (session.id) sessionById.set(session.id, session.created_at)
  }

  return (reviews ?? []).map(review => {
    const activity = review.activity
    const activityName = Array.isArray(activity)
      ? activity[0]?.name ?? null
      : activity?.name ?? null

    return {
      session_id: review.session_id ?? null,
      session_date: review.session_id ? sessionById.get(review.session_id) ?? null : null,
      rating: review.rating,
      comment: review.comment,
      activity: activityName,
    }
  })
}
