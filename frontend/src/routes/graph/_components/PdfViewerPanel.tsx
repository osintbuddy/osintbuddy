import { useEffect, useState } from 'preact/hooks'
import { useAuthStore, usePdfViewerStore } from '@/app/store'
import { BASE_URL } from '@/app/baseApi'
import { Icon } from '@/components/icons'
import { createPluginRegistration } from '@embedpdf/core'
import { useCapability } from '@embedpdf/core/react'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import {
  Viewport,
  ViewportPluginPackage,
} from '@embedpdf/plugin-viewport/react'
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react'
import { LoaderPluginPackage } from '@embedpdf/plugin-loader/react'
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react'
import type { LoaderPlugin } from '@embedpdf/plugin-loader'
import type { ScrollPlugin } from '@embedpdf/plugin-scroll'

type PDFViewerProps = {
  blobUrl: string
  page: number
  onNumPages?: (n: number) => void
}

export const PDFViewer = ({ blobUrl, page, onNumPages }: PDFViewerProps) => {
  const pdf = usePdfViewerStore()
  const { engine, isLoading } = usePdfiumEngine()

  // Register plugins with current blob url and initial page
  const plugins = [
    createPluginRegistration(LoaderPluginPackage, {
      loadingOptions: {
        type: 'url',
        pdfFile: { id: pdf.active || 'active-pdf', url: blobUrl },
      },
    }),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage, { initialPage: page }),
    createPluginRegistration(RenderPluginPackage),
  ]

  // Access loader + scroll capabilities
  const loaderCap = useCapability<LoaderPlugin>('loader')
  const scrollCap = useCapability<ScrollPlugin>('scroll')

  // Load/Reload document when blob changes
  useEffect(() => {
    if (!blobUrl) return
    if (!loaderCap.provides) return
    loaderCap.provides
      .loadDocument({
        type: 'url',
        pdfFile: { id: pdf.active || 'active-pdf', url: blobUrl },
      })
      .catch(() => void 0)
  }, [blobUrl, loaderCap.provides, pdf.active])

  // Subscribe for document loaded -> set num pages
  useEffect(() => {
    if (!loaderCap.provides) return
    const unsub = loaderCap.provides.onDocumentLoaded.subscribe((doc) => {
      const n = doc?.pageCount ?? 0
      if (n > 0 && pdf.active) {
        onNumPages?.(n)
        pdf.setNumPages(pdf.active, n)
      }
    })
    return () => unsub()
  }, [loaderCap.provides, pdf.active])

  // Keep scroll position in sync with selected page
  useEffect(() => {
    if (!scrollCap.provides || !page) return
    // center the requested page; fall back to instant behavior
    scrollCap.provides.scrollToPage({
      pageNumber: page,
      behavior: 'auto',
      center: true,
    })
  }, [scrollCap.provides, page])

  // Reflect page changes back to store when user scrolls
  useEffect(() => {
    if (!scrollCap.provides || !pdf.active) return
    const unsub = scrollCap.provides.onPageChange.subscribe(
      ({ pageNumber }) => {
        if (pdf.active) pdf.setPage(pdf.active, pageNumber)
      }
    )
    return () => unsub()
  }, [scrollCap.provides, pdf.active])

  if (isLoading || !engine) {
    return (
      <div className='p-2 text-xs text-slate-400'>Initializing PDF engine…</div>
    )
  }

  return (
    <div style={{ height: '100%' }}>
      <EmbedPDF engine={engine} plugins={plugins}>
        <Viewport style={{ backgroundColor: 'transparent' }}>
          <Scroller
            renderPage={({ width, height, pageIndex, scale }) => (
              <div style={{ width, height }}>
                <RenderLayer pageIndex={pageIndex} scale={scale} />
              </div>
            )}
          />
        </Viewport>
      </EmbedPDF>
    </div>
  )
}

interface PdfViewerPanelProps {
  draggable: boolean
  onToggleDrag: () => void
}

export default function PdfViewerPanel({
  draggable,
  onToggleDrag,
}: PdfViewerPanelProps) {
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
      <div className='flex flex-col'>
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
              title={
                draggable ? 'Unlock panel position' : 'Lock panel position'
              }
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
                  Page{' '}
                  {pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page} of{' '}
                  {
                    pdf.tabs.find((t) => t.attachmentId === pdf.active)
                      ?.numPages
                  }
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
          className='relative z-10 mx-2 flex flex-nowrap gap-1 overflow-x-hidden border-b border-slate-800/60'
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
      </div>

      <div className='relative z-0 overflow-auto'>
        {loading && (
          <div className='p-2 text-xs text-slate-400'>Loading PDF…</div>
        )}
        {error && <div className='p-2 text-xs text-red-400'>{error}</div>}
        {!loading && !error && blobUrl && (
          <div className='relative z-0'>
            <PDFViewer
              blobUrl={blobUrl}
              page={
                (pdf.active &&
                  (pdf.tabs.find((t) => t.attachmentId === pdf.active)?.page ||
                    1)) ||
                1
              }
              onNumPages={(n) => {
                if (pdf.active) pdf.setNumPages(pdf.active, n)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
