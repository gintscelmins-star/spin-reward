'use client'

import { useState, useRef, useActionState } from 'react'
import { publishWheel } from '../../actions'

type Device = 'desktop' | 'mobile'

interface Props {
  wheelId: string
  previewUrl: string
  isActive: boolean
  hasSegments: boolean
  hasEmailField: boolean
}

export default function PreviewClient({ wheelId, previewUrl, isActive, hasSegments, hasEmailField }: Props) {
  const [device, setDevice] = useState<Device>('desktop')
  const [showConfirm, setShowConfirm] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [state, formAction, pending] = useActionState(publishWheel, null)

  const iframeWidth = device === 'mobile' ? '390px' : '100%'

  function reload() {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  if (state?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Wheel publicēts!</h2>
        <p className="text-gray-500 mb-6">Wheel ir aktīvs un redzams apmeklētājiem.</p>
        <a
          href={`/dashboard/widgets/${wheelId}/embed`}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
        >
          Skatīt embed kodu →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['desktop', 'mobile'] as Device[]).map(d => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                device === d ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
            </button>
          ))}
        </div>
        <button
          onClick={reload}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          ↻ Atjaunot preview
        </button>
      </div>

      {/* iframe */}
      <div className="bg-gray-200 rounded-2xl overflow-hidden flex justify-center p-4 min-h-[500px]">
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={{ width: iframeWidth, maxWidth: '100%' }}
          className="h-[580px] bg-white rounded-xl shadow-lg border-0 transition-all duration-300"
          title="Wheel preview"
        />
      </div>

      {/* Publish section */}
      {!isActive && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Publicēt wheel</h3>

          {/* Validation warnings */}
          {!hasSegments && (
            <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <span>⚠</span> Pievienojiet vismaz 1 segmentu pirms publicēšanas
            </div>
          )}
          {!hasEmailField && (
            <div className="mb-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span>⚠</span> E-pasta lauks nav konfigurēts — leads nevarēs savākt e-pastus
            </div>
          )}

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!hasSegments}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors text-sm"
            >
              Publicēt wheel
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-gray-600 font-medium">Vai tiešām aktivizēt wheel?</p>
              <form action={formAction} className="flex gap-2">
                <input type="hidden" name="wheel_id" value={wheelId} />
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {pending ? 'Publicē...' : 'Jā, publicēt'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Atcelt
                </button>
              </form>
            </div>
          )}

          {state?.error && (
            <p className="mt-3 text-sm text-red-600">{state.error}</p>
          )}
        </div>
      )}

      {isActive && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          <span>✅</span> Wheel ir aktīvs
          <a href={`/dashboard/widgets/${wheelId}/embed`} className="ml-auto text-purple-600 hover:underline text-xs">
            Skatīt embed kodu →
          </a>
        </div>
      )}
    </div>
  )
}
