'use client'

import { useState } from 'react'
import { toggleWheelActive } from '../../actions'

type Tab = 'script' | 'link' | 'iframe'

interface Props {
  wheelId: string
  slug: string
  appUrl: string
  triggerType: string
  active: boolean
  qrDataUrl: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-lg transition-colors"
    >
      {copied ? 'Nokopēts!' : 'Kopēt'}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">HTML</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  )
}

export default function EmbedClient({ wheelId, slug, appUrl, triggerType, active, qrDataUrl }: Props) {
  const [tab, setTab] = useState<Tab>('script')

  const scriptCode = `<script\n  src="${appUrl}/widget.js"\n  data-wheel="${slug}">\n</script>`
  const iframeCode = `<iframe\n  src="${appUrl}/w/${slug}?mode=inline"\n  width="100%"\n  height="600"\n  frameborder="0">\n</iframe>`
  const directUrl = `${appUrl}/w/${slug}`

  const triggerHints: Record<string, { note: string; extra?: string }> = {
    delay:          { note: 'Ieliec kodu pirms </body> taga' },
    exit_intent:    { note: 'Ieliec kodu pirms </body> taga' },
    scroll_pct:     { note: 'Ieliec kodu pirms </body> taga' },
    element_click:  {
      note: 'Ieliec kodu pirms </body> taga. Pievienojiet arī šo pogu lapā:',
      extra: `<button data-spillit-trigger>Griezt ratu!</button>`,
    },
    inline: {
      note: 'Ieliec script pirms </body> taga. Pievienojiet šo elementu tur, kur vēlaties ratu:',
      extra: `<div data-spillit-inline="${slug}"></div>`,
    },
    direct_link: { note: 'Kods nav nepieciešams — izmantojiet tiešo saiti.' },
  }

  const hint = triggerHints[triggerType] ?? triggerHints['delay']

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {([
          ['script', 'Script (ieteicams)'],
          ['link',   'Tiešā saite'],
          ['iframe', 'iFrame'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'text-purple-700 border-b-2 border-purple-600 -mb-px bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Script */}
      {tab === 'script' && (
        <div className="space-y-4">
          <CodeBlock code={scriptCode} />
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">📋 {hint.note}</p>
            {hint.extra && (
              <div className="mt-3">
                <CodeBlock code={hint.extra} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Direct link */}
      {tab === 'link' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <code className="flex-1 text-sm text-gray-700 font-mono break-all">{directUrl}</code>
            <CopyButton text={directUrl} />
          </div>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-3 bg-white border border-gray-200 rounded-xl p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR kods" width={200} height={200} />
              <p className="text-xs text-gray-500">QR kods uz wheel lapu</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {['E-pasta kampaņā', 'WhatsApp ziņā', 'Instagram bio', 'Drukāts QR kods'].map(uc => (
              <div key={uc} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                <span>✓</span> {uc}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: iFrame */}
      {tab === 'iframe' && (
        <div className="space-y-4">
          <CodeBlock code={iframeCode} />
          <p className="text-sm text-gray-500">
            Ieliec kodu savā lapā tur, kur vēlaties parādīt ratu.
          </p>
        </div>
      )}

      {/* Status */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Wheel statuss</p>
            <p className={`text-xs mt-0.5 font-semibold ${active ? 'text-green-600' : 'text-amber-600'}`}>
              {active ? '✅ Aktīvs' : '⏸ Neaktīvs'}
            </p>
            {!active && (
              <p className="text-xs text-amber-600 mt-1">
                Wheel nav aktīvs — apmeklētāji neredzēs widget
              </p>
            )}
          </div>
          <form action={toggleWheelActive}>
            <input type="hidden" name="id" value={wheelId} />
            <input type="hidden" name="active" value={String(active)} />
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {active ? 'Deaktivizēt' : 'Aktivizēt'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
