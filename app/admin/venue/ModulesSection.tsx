import Link from 'next/link'

export default function ModulesSection({ venueId }: { venueId: string }) {
  void venueId
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800">Moduļi</h2>
        <span className="text-xs text-gray-400">Rats + balvas vienmēr ieslēgts</span>
      </div>
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            Spin Reward un Darbinieku novērtējums ir aktīvi visos plānos.
            Papildu moduļi (Tips, Google, Spin+Meta, Maiņu grafiks u.c.) tiek aktivizēti pēc pieprasījuma.
          </p>
        </div>
        <Link
          href="/moduli"
          target="_blank"
          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
        >
          Skatīt moduļus →
        </Link>
      </div>
    </div>
  )
}
