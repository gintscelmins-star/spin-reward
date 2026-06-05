import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function VenuePicker({ basePath }: { basePath: string }) {
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, slug, active')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/venues" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Venues
          </Link>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-4">Izvēlies venue</h1>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {(venues ?? []).map(v => (
            <Link
              key={v.id}
              href={`${basePath}?venueId=${v.id}`}
              className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-800">{v.name}</p>
                <p className="text-xs text-gray-400 font-mono">{v.slug}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full mr-4 ${
                  v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {v.active ? 'aktīvs' : 'neaktīvs'}
              </span>
            </Link>
          ))}
          {!venues?.length && (
            <p className="px-5 py-10 text-center text-gray-400">Nav nevienas venue</p>
          )}
        </div>
      </div>
    </div>
  )
}
