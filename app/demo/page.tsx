export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getAdmin } from '@/lib/supabase/admin'
import ModulesSection from '@/app/admin/venue/ModulesSection'
import LaserstatsBanner from '@/components/admin/LaserstatsBanner'

const VENUE_ID = 'a69edc53-8385-46ec-b24f-fc287a7a0e32'

export default async function DemoPage() {
  const supabase = getAdmin()

  const [{ data: venue }, { count: activeStaff }] = await Promise.all([
    supabase.from('venues').select('*').eq('id', VENUE_ID).single(),
    supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', VENUE_ID)
      .eq('active', true),
  ])

  if (!venue) return <p>Venue not found</p>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Demo badge */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-800">
          <span>👁️</span>
          <span>Demo skats — tikai apskatei, bez izmaiņām</span>
        </div>

        <LaserstatsBanner />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{venue.name}</h1>
            <p className="text-sm text-gray-400 font-mono">{venue.slug}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Plāns</p>
            <p className="text-xl font-bold text-purple-600 capitalize">{venue.plan}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Darbinieki</p>
            <p className={`text-xl font-bold ${(activeStaff ?? 0) > venue.seats ? 'text-red-600' : 'text-gray-800'}`}>
              {activeStaff ?? 0}
              <span className="text-gray-400 text-base font-normal">/{venue.seats}</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Norēķini</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              venue.billing_status === 'active' ? 'bg-green-100 text-green-700'
              : venue.billing_status === 'trial' ? 'bg-blue-100 text-blue-700'
              : 'bg-red-100 text-red-700'
            }`}>
              {venue.billing_status}
            </span>
          </div>
        </div>

        <ModulesSection venueId={VENUE_ID} />

        <Link
          href="/admin/venue/upsell"
          className="block rounded-2xl border border-indigo-100 p-5 hover:shadow-md transition-all group"
          style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 60%, #FFF0FB 100%)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-indigo-800">Papildu moduļi</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-semibold">Pēc pasūtījuma</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              { icon: '🎡', name: 'Spin Reward', active: true },
              { icon: '💛', name: 'Tips', active: venue.module_tips_enabled ?? false },
              { icon: '🔍', name: 'Google', active: venue.module_google_enabled ?? true },
              { icon: '⭐', name: 'Novērtējums', active: false },
              { icon: '📣', name: 'Spin+Meta', active: false },
              { icon: '🎫', name: 'Digital Stamps', active: false },
              { icon: '📋', name: 'Lead Capture', active: false },
              { icon: '🎓', name: 'Onboarding', active: false },
            ] as const).map(m => (
              <span key={m.name} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                m.active ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-white/70 text-indigo-400 border border-indigo-100'
              }`}>
                {m.icon} {m.name}
              </span>
            ))}
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-4">
          {[
            { href: '/admin/venue/prizes', title: 'Balvas', desc: 'Pārvaldīt ruletē esošās balvas' },
            { href: '/admin/venue/ledger', title: 'Izsniedzamās balvas', desc: 'Krājums, ledger, CSV grāmatvedībai' },
            { href: '/admin/venue/staff', title: 'Personāls', desc: 'Darbinieki un tip kartes' },
            { href: '/admin/venue/activities', title: 'Spēles', desc: 'Aktivitāšu veidi un sesiju plūsma' },
            { href: '/admin/venue/bookings', title: 'Rezervācijas', desc: 'Šodienas un nākamo dienu saraksts' },
            { href: '/admin/session', title: 'Sesija', desc: 'Aktivizēt spin un parādīt QR klientam' },
            { href: '/admin/venue/questions', title: 'Novērtējumi', desc: 'Atsauksmju jautājumu konfigurācija' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group">
              <p className="text-lg font-bold text-gray-800 group-hover:text-purple-700">{item.title}</p>
              <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
            </Link>
          ))}
          <Link href="/admin/venue/stats"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group col-span-2">
            <p className="text-lg font-bold text-gray-800 group-hover:text-purple-700">Statistika</p>
            <p className="text-sm text-gray-400 mt-1">Spini, atsauksmes, tips</p>
          </Link>
        </div>

      </div>
    </div>
  )
}
