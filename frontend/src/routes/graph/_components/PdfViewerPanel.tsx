import { useEffect, useState } from 'preact/hooks'
import { useAuthStore, usePdfViewerStore } from '@/app/store'
import { BASE_URL } from '@/app/baseApi'
import { Icon } from '@/components/icons'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

interface Props {
  draggable: boolean
  onToggleDrag: () => void
}

export default function PdfViewerPanel({ draggable, onToggleDrag }: Props) {
  const pdf = usePdfViewerStore()
  const { access_token } = useAuthStore()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let revoke: string | null = null
    const load = async () => {
      if (!pdf.open || !pdf.active) return
      setLoading(true)
      setError(null)
      setBlobUrl(null)
      try {
        const resp = await fetch(
          `${BASE_URL}/entities/attachments/${pdf.active}`,
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        )
        if (!resp.ok) throw new Error('Failed to load PDF')
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
        revoke = url
      } catch (e: any) {
        setError(e?.message || 'Failed to load PDF')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [pdf.open, pdf.active])

  if (!pdf.open) return null
  return (
    <div className='pointer-events-auto z-10 flex h-full w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'>
      <ol className='relative flex px-2 pt-2 text-sm select-none'>
        <li className='mr-auto flex'>
          <h5 className='font-display flex w-full grow items-center justify-between truncate whitespace-nowrap text-inherit'>
            <span className='font-display flex w-full items-center justify-between font-medium text-slate-500'>
              <Icon icon='file-type-pdf' />
              <span className='ml-1 truncate'>
                {pdf.tabs.find((t) => t.attachmentId === pdf.active)
                  ?.filename || 'PDF Preview'}
              </span>
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
          {pdf.active &&
            pdf.tabs.find((t) => t.attachmentId === pdf.active)?.numPages && (
              <div className='text-[11px] text-slate-400'>
                Page {pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page}{' '}
                of{' '}
                {pdf.tabs.find((t) => t.attachmentId === pdf.active)?.numPages}
              </div>
            )}
          <button
            onClick={() => pdf.closeViewer()}
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
        {pdf.tabs.map((t) => (
          <div
            key={t.attachmentId}
            className={`flex items-center rounded-t border border-slate-800/60 px-2 py-1 text-xs ${
              pdf.active === t.attachmentId
                ? 'bg-slate-900/60 text-slate-200'
                : 'bg-slate-925/40 text-slate-400'
            }`}
          >
            <button
              className='text-left whitespace-nowrap'
              onClick={() => pdf.setActive(t.attachmentId)}
            >
              {t.filename || 'PDF'}
            </button>
            <button
              title='Close tab'
              onClick={() => pdf.closeTab(t.attachmentId)}
              className='text-slate-500 hover:text-slate-300'
            >
              <Icon icon='x' className='h-3 w-3' />
            </button>
          </div>
        ))}
      </div>
      <div className='overflow-auto p-2'>
        {loading && (
          <div className='p-2 text-xs text-slate-400'>Loading PDF…</div>
        )}
        {error && <div className='p-2 text-xs text-red-400'>{error}</div>}
        {!loading && !error && blobUrl && (
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages }) => {
              if (pdf.active) pdf.setNumPages(pdf.active, numPages)
            }}
            onLoadError={() => setError('Failed to render PDF')}
            className='[&_canvas]:mx-auto'
          >
            <Page
              pageNumber={
                (pdf.active &&
                  pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page) ||
                1
              }
              width={560}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>
        )}
      </div>
      <div className='flex items-center justify-center gap-2 p-2'>
        <button
          className='rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-300 disabled:opacity-50'
          onClick={() => {
            if (!pdf.active) return
            const cur =
              pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page || 1
            pdf.setPage(pdf.active, Math.max(1, cur - 1))
          }}
          disabled={
            !pdf.active ||
            !pdf.tabs.find((t) => t.attachmentId === pdf.active)?.numPages ||
            (pdf.active
              ? (pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page ||
                  1) <= 1
              : true)
          }
        >
          Prev
        </button>
        <button
          className='rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-300 disabled:opacity-50'
          onClick={() => {
            if (!pdf.active) return
            const cur =
              pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page || 1
            const max =
              pdf.tabs.find((t) => t.attachmentId === pdf.active)?.numPages || 1
            pdf.setPage(pdf.active, Math.min(max, cur + 1))
          }}
          disabled={
            !pdf.active ||
            !pdf.tabs.find((t) => t.attachmentId === pdf.active)?.numPages ||
            (pdf.active
              ? (pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page ||
                  1) >=
                (pdf.tabs.find((t) => t.attachmentId === pdf.active)
                  ?.numPages || 1)
              : true)
          }
        >
          Next
        </button>
      </div>
    </div>
  )
}
