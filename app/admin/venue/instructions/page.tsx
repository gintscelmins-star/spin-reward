import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function Section({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-base font-bold text-gray-800 mb-3">
        {icon} {title}
      </h2>
      {children}
    </div>
  )
}

export default async function InstructionsPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, venue_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['client_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const params = await searchParams
  const q =
    profile.role === 'super_admin' && params.venueId ? `?venueId=${params.venueId}` : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <Link href={`/admin/venue${q}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Atpakaļ
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Kā lietot SpinReward</h1>
        </div>

        <Section icon="📋" title="Ikdienas saraksts">
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>
              Atver <strong>Sesija</strong> un izvēlies darbinieku un aktivitāti
            </li>
            <li>Aktivizē sesiju — tiek ģenerēts QR kods</li>
            <li>Parādi QR klientam (viņš skenē un griež ratu)</li>
            <li>Klients novērtē pieredzi, griež ratu un saņem balvu</li>
          </ol>
        </Section>

        <Section icon="🎁" title="Balvu izsniegšana">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Klients uzrāda QR kodu pie darbinieka vai kasiera</li>
            <li>• Balvu var nosūtīt uz klienta WhatsApp vai SMS</li>
            <li>
              • Balva redzama arī <strong>Statistikā</strong> — ar nosaukumu un laiku
            </li>
            <li>
              • QR kods ir vienreizlietojams — pēc apstiprināšanas tiek atzīmēts kā izlietots
            </li>
          </ul>
        </Section>

        <Section icon="⚙️" title="Konfigurācija">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              • <strong>Balvas</strong> — pievieno, rediģē vai paslēp balvas laimes ratā
            </li>
            <li>
              • <strong>Novērtējumi</strong> — konfigurē atsauksmju jautājumus (zvaigznes / īkšķi)
            </li>
            <li>
              • <strong>Personāls</strong> — pievieno darbiniekus, iestata tip kartītes un spinu
              limitu
            </li>
            <li>
              • <strong>Moduļi</strong> — ieslēdz/izslēdz Google atgādinājumu, dzeramnaudu,
              WhatsApp
            </li>
            <li>
              • <strong>Teksti</strong> — tulko vai pielāgo visus klientam redzamos tekstus
            </li>
          </ul>
        </Section>

        <Section icon="💛" title="Dzeramnauda (Tips)">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              • Ieslēdz <strong>Moduļi → Dzeramnauda</strong>
            </li>
            <li>
              • Katram darbiniekam pievieno tip linku{' '}
              <strong>Personāls → Rediģēt → Tip karte</strong>
            </li>
            <li>• Ieslēdz darbiniekam <strong>Tips iespējotas</strong></li>
            <li>
              • Pēc balvas saņemšanas klientam parādās jautājums &quot;Vai pateikties
              darbiniekam?&quot;
            </li>
            <li>• &quot;Jā&quot; → atveras darbinieka tip lapa</li>
          </ul>
        </Section>

        <Section icon="📊" title="Statistika">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• <strong>Spini</strong> — kopējo spinu skaits, laikā un pa darbinieku</li>
            <li>• <strong>Atsauksmes</strong> — reitingi, komentāri, problēmjautājumi</li>
            <li>
              • Statistika pieejama <strong>Statistika</strong> sadaļā
            </li>
          </ul>
        </Section>
      </div>
    </div>
  )
}
