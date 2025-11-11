import { useEffect, useRef, useState } from 'preact/hooks'
import { useAuthStore, useAudioViewerStore } from '@/app/store'
import { BASE_URL } from '@/app/baseApi'
import { Icon } from '@/components/icons'
import WaveSurfer from 'wavesurfer.js'
import { request } from '@/app/api'

interface Props {
  draggable: boolean
  onToggleDrag: () => void
}

export default function AudioViewerPanel({ draggable, onToggleDrag }: Props) {
  const audio = useAudioViewerStore()
  const { accessToken } = useAuthStore()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    let revoke: string | null = null
    const load = async () => {
      if (!audio.open || !audio.active) return
      setLoading(true)
      setError(null)
      setBlobUrl(null)
      try {
        const resp = await request('/entities/attachments/${audio.active}')
        if (!resp.ok) throw new Error('Failed to load audio')
        const b = await resp.blob()
        const url = URL.createObjectURL(b)
        setBlobUrl(url)
        revoke = url
      } catch (e: any) {
        setError(e?.message || 'Failed to load audio')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [audio.open, audio.active])

  // Initialize WaveSurfer when container and blobUrl are ready
  useEffect(() => {
    if (!containerRef.current) return
    if (!blobUrl) return

    // Destroy previous instance if any
    if (wsRef.current) {
      wsRef.current.destroy()
      wsRef.current = null
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#b8b8b8',
      progressColor: '#a0c6ff',
      cursorColor: '#9ca3af',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 120,
      responsive: true,
      normalize: true,
      url: blobUrl,
    })

    ws.on('ready', () => {
      setDuration(ws.getDuration())
    })
    ws.on('timeupdate', (t: number) => setCurrentTime(t))
    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })

    wsRef.current = ws

    return () => {
      ws.destroy()
      wsRef.current = null
    }
  }, [blobUrl])

  const play = () => {
    if (!wsRef.current) return
    wsRef.current.play()
  }

  const pause = () => {
    if (!wsRef.current) return
    wsRef.current.pause()
  }

  const stop = () => {
    if (!wsRef.current) return
    wsRef.current.stop()
    setIsPlaying(false)
    setCurrentTime(0)
  }

  if (!audio.open) return null
  const activeTab = audio.tabs.find((t) => t.attachmentId === audio.active)
  const filename = activeTab?.filename || 'Audio Preview'

  return (
    <div className='pointer-events-auto z-10 flex h-full w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'>
      <ol className='relative flex px-2 pt-2 text-sm select-none'>
        <li className='mr-auto flex'>
          <h5 className='font-display flex w-full grow items-center justify-between truncate whitespace-nowrap text-inherit'>
            <span className='font-display flex w-full items-center justify-between font-medium text-slate-500'>
              <Icon icon='player-play' />
              <span className='ml-1 truncate'>{filename}</span>
            </span>
          </h5>
        </li>
        <li className='flex items-center gap-2'>
          <button
            onClick={onToggleDrag}
            className='hover:text-alert-700 font-display whitespace-nowrap text-slate-800'
            title={draggable ? 'Unlock panel position' : 'Lock panel position'}
          >
            {draggable ? (
              <Icon icon='lock-open' className='h-5 w-5 text-inherit' />
            ) : (
              <Icon icon='lock' className='h-5 w-5 text-inherit' />
            )}
          </button>
          <button
            onClick={() => audio.closeViewer()}
            className='hover:text-alert-700 font-display t whitespace-nowrap text-slate-800'
            title='Close preview'
          >
            <Icon icon='x' className='h-5 w-5 text-inherit' />
          </button>
        </li>
      </ol>
      {/* Tabs */}
      <div
        className='mx-2 mb-2 flex flex-nowrap gap-1 overflow-x-hidden border-b border-slate-800/60'
        onWheel={(e) => {
          const el = e.currentTarget as HTMLDivElement
          if (e.deltaY !== 0) {
            el.scrollLeft += e.deltaY
            e.preventDefault()
          }
        }}
      >
        {audio.tabs.map((t) => (
          <div
            key={t.attachmentId}
            className={`flex items-center rounded-t border border-slate-800/60 px-2 py-1 text-xs ${
              audio.active === t.attachmentId
                ? 'bg-slate-900/60 text-slate-200'
                : 'bg-slate-925/40 text-slate-400'
            }`}
          >
            <button
              className='text-left whitespace-nowrap'
              onClick={() => audio.setActive(t.attachmentId)}
            >
              {t.filename || 'Audio'}
            </button>
            <button
              title='Close tab'
              onClick={() => audio.closeTab(t.attachmentId)}
              className='text-slate-500 hover:text-slate-300'
            >
              <Icon icon='x' className='h-3 w-3' />
            </button>
          </div>
        ))}
      </div>
      <div className='overflow-auto p-2'>
        {loading && (
          <div className='p-2 text-xs text-slate-400'>Loading audio…</div>
        )}
        {error && <div className='p-2 text-xs text-red-400'>{error}</div>}
        {!loading && !error && blobUrl && (
          <div className='flex flex-col items-center gap-3'>
            <div
              ref={containerRef}
              className='h-[120px] w-[560px]'
              data-testid='wavesurfer-container'
            />
            <div className='flex items-center gap-2'>
              {!isPlaying ? (
                <button
                  className='rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-300'
                  onClick={play}
                >
                  Play
                </button>
              ) : (
                <button
                  className='rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-300'
                  onClick={pause}
                >
                  Pause
                </button>
              )}
              <button
                className='rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-300'
                onClick={stop}
              >
                Stop
              </button>
              <span className='text-[11px] text-slate-400'>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(t: number) {
  if (!isFinite(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
