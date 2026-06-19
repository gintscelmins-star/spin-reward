'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type ScanState = 'idle' | 'requesting' | 'scanning' | 'found' | 'error'

// BarcodeDetector type declaration (not in all TS libs)
declare class BarcodeDetector {
  static getSupportedFormats(): Promise<string[]>
  constructor(options?: { formats: string[] })
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>
}

function checkBarcodeSupport(): boolean {
  if (typeof window === 'undefined') return false
  return (
    typeof BarcodeDetector !== 'undefined' &&
    typeof BarcodeDetector.getSupportedFormats === 'function'
  )
}

export default function AdminRedeemPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const detectorRef = useRef<InstanceType<typeof BarcodeDetector> | null>(null)

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  // Lazily computed once on client — avoids setState-in-effect lint error
  const [barcodeSupported] = useState<boolean>(checkBarcodeSupport)

  function stopCamera() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  const navigate = useCallback((token: string) => {
    setScanState('found')
    stopCamera()
    // Small delay so user sees "found" flash
    setTimeout(() => {
      router.push(`/redeem/${encodeURIComponent(token)}`)
    }, 300)
  }, [router])

  const startScan = useCallback(async () => {
    setScanState('requesting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      if (!videoRef.current) { stopCamera(); return }
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setScanState('scanning')

      // Try BarcodeDetector
      if (barcodeSupported) {
        try {
          const detector = new BarcodeDetector({ formats: ['qr_code'] })
          detectorRef.current = detector

          const tick = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              rafRef.current = requestAnimationFrame(tick)
              return
            }
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                navigate(barcodes[0].rawValue)
                return
              }
            } catch {
              // Ignore frame errors — continue scanning
            }
            rafRef.current = requestAnimationFrame(tick)
          }
          rafRef.current = requestAnimationFrame(tick)
          return
        } catch {
          // BarcodeDetector failed, fall through to canvas method
        }
      }

      // Canvas fallback: periodically capture frame and check QR via manual input
      // (Canvas-only decode would need jsQR which isn't installed; show hint)
      setScanState('scanning')
      // Draw video to canvas for visual reference — user can still use manual input
      const drawLoop = () => {
        const canvas = canvasRef.current
        const video = videoRef.current
        if (canvas && video && video.readyState >= 2) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)
          }
        }
        rafRef.current = requestAnimationFrame(drawLoop)
      }
      rafRef.current = requestAnimationFrame(drawLoop)

    } catch (err) {
      stopCamera()
      setScanState('error')
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Kamera nav atļauta. Atļauj piekļuvi kamerai un mēģini vēlreiz.')
        } else if (err.name === 'NotFoundError') {
          setError('Kamera nav atrasta šajā ierīcē.')
        } else {
          setError(`Kamera kļūda: ${err.message}`)
        }
      } else {
        setError('Neizdevās piekļūt kamerai.')
      }
    }
  }, [barcodeSupported, navigate])

  function handleStop() {
    stopCamera()
    setScanState('idle')
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) return
    navigate(code)
  }

  const isScanning = scanState === 'scanning' || scanState === 'requesting'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe-top pt-6 pb-4 border-b border-gray-800">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white text-2xl leading-none w-10 h-10 flex items-center justify-center"
          aria-label="Atpakaļ"
        >
          ←
        </button>
        <h1 className="text-xl font-bold tracking-tight">QR Skeneris</h1>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-8 gap-6 max-w-md mx-auto w-full">

        {/* Camera viewfinder */}
        <div className="w-full relative rounded-3xl overflow-hidden bg-gray-900 aspect-square flex items-center justify-center">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* Overlay guide when not scanning */}
          {!isScanning && (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
              {scanState === 'found' ? (
                <>
                  <span className="text-6xl">✓</span>
                  <p className="text-xl font-bold text-green-400">Atrasts!</p>
                </>
              ) : scanState === 'error' ? (
                <>
                  <span className="text-5xl">📷</span>
                  <p className="text-gray-400 text-sm">{error}</p>
                </>
              ) : (
                <>
                  {/* QR viewfinder frame */}
                  <div className="w-48 h-48 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl opacity-30">🔲</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">Nospied pogu, lai aktivizētu kameru</p>
                </>
              )}
            </div>
          )}

          {/* Scanning overlay */}
          {scanState === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Corner guides */}
              <div className="w-56 h-56 relative">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />
              </div>
            </div>
          )}

          {scanState === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Main action button */}
        {!isScanning && scanState !== 'found' && (
          <button
            onClick={startScan}
            className="w-full py-5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xl font-black rounded-2xl transition-all shadow-lg shadow-purple-900/30"
          >
            📷 Skenēt QR
          </button>
        )}

        {isScanning && (
          <button
            onClick={handleStop}
            className="w-full py-4 bg-gray-800 hover:bg-gray-700 active:scale-95 text-white text-lg font-bold rounded-2xl transition-all"
          >
            ✕ Apturēt
          </button>
        )}

        {/* Status info */}
        {scanState === 'scanning' && barcodeSupported && (
          <p className="text-gray-500 text-sm text-center">
            Pabīdi QR kodu kameras priekšā — automātiski atpazīs
          </p>
        )}
        {scanState === 'scanning' && barcodeSupported === false && (
          <div className="w-full p-3 bg-amber-900/40 border border-amber-700/50 rounded-xl">
            <p className="text-amber-300 text-sm text-center">
              Šī pārlūkprogramma neatbalsta automātisko QR skenēšanu.
              Izmanto manuālo ievadi zemāk.
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs uppercase tracking-widest">vai</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Manual code entry */}
        <div className="w-full">
          <p className="text-sm font-medium text-gray-400 mb-3">Ievadīt kodu manuāli</p>
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Ievadi QR kodu vai UUID..."
              className="w-full px-4 py-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-base placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full py-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white text-lg font-bold rounded-2xl transition-all"
            >
              Apstiprināt
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
