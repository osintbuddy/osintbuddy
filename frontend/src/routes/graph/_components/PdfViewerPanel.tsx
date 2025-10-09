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
import ShinyText from '@/components/ShinyText'
import Tabs from './Tabs'

type PDFViewerProps = {
  blobUrl: string
  page: number
  coords?: { x: number; y: number }
  onNumPages?: (n: number) => void
}

export const PDFViewer = ({ blobUrl, page, coords, onNumPages }: PDFViewerProps) => {
  const pdfStore = usePdfViewerStore()
  const { engine, isLoading } = usePdfiumEngine()

  const plugins = [
    createPluginRegistration(LoaderPluginPackage, {
      loadingOptions: {
        type: 'url',
        pdfFile: { id: pdfStore.active || 'active-pdf', url: blobUrl },
      },
    }),
    createPluginRegistration(ViewportPluginPackage),
    // Ensure initial page defaults to 1 but respects saved page
    createPluginRegistration(ScrollPluginPackage, { initialPage: Math.max(1, page || 1) }),
    createPluginRegistration(RenderPluginPackage),
  ]

  const loaderCap = useCapability<LoaderPlugin>('loader')
  const scrollCap = useCapability<ScrollPlugin>('scroll')

  // Load/reload document when blob changes and re-apply saved position
  useEffect(() => {
    if (!blobUrl) return
    if (!loaderCap.provides) return
    loaderCap.provides
      .loadDocument({
        type: 'url',
        pdfFile: { id: pdfStore.active || 'active-pdf', url: blobUrl },
      })
      .then(() => {
        if (scrollCap.provides && page) {
          scrollCap.provides.scrollToPage({
            pageNumber: page,
            behavior: 'auto',
            center: coords ? false : true,
            pageCoordinates: coords,
          })
        }
      })
      .catch((err) => console.error(err))
  }, [blobUrl, loaderCap.provides, scrollCap.provides, page, coords?.x, coords?.y, pdfStore.active])

  // Subscribe for document loaded -> set num pages and restore scroll
  useEffect(() => {
    if (!loaderCap.provides) return
    const unsub = loaderCap.provides.onDocumentLoaded.subscribe((doc) => {
      const n = doc?.pageCount ?? 0
      if (n > 0 && pdfStore.active) {
        onNumPages?.(n)
        pdfStore.setNumPages(pdfStore.active, n)
        if (scrollCap.provides && page) {
          scrollCap.provides.scrollToPage({
            pageNumber: page,
            behavior: 'auto',
            center: coords ? false : true,
            pageCoordinates: coords,
          })
        }
      }
    })
    return () => unsub()
  }, [loaderCap.provides, scrollCap.provides, page, coords?.x, coords?.y, pdfStore.active])

  // Keep scroll position in sync with selected page + coordinates
  // Include pdf.active so switching tabs re-applies the saved position
  useEffect(() => {
    if (!scrollCap.provides || !page) return
    scrollCap.provides.scrollToPage({
      pageNumber: page,
      behavior: 'auto',
      center: coords ? false : true,
      pageCoordinates: coords,
    })
  }, [scrollCap.provides, page, coords?.x, coords?.y, pdfStore.active])

  // After layout ready, re-apply scroll target (helps when switching tabs)
  // Include pdf.active so listener captures the right tab state
  useEffect(() => {
    if (!scrollCap.provides || !page) return
    const unsub = scrollCap.provides.onLayoutReady.subscribe(() => {
      scrollCap.provides.scrollToPage({
        pageNumber: page,
        behavior: 'auto',
        center: coords ? false : true,
        pageCoordinates: coords,
      })
    })
    return () => unsub()
  }, [scrollCap.provides, page, coords?.x, coords?.y, pdfStore.active])

  // Reflect page + per-page coordinates back to store when user scrolls
  useEffect(() => {
    if (!scrollCap.provides || !pdfStore.active) return
    const unsubChange = scrollCap.provides.onPageChange.subscribe(({ pageNumber }) => {
      if (pdfStore.active) pdfStore.setPage(pdfStore.active, pageNumber)
    })
    const unsubScroll = scrollCap.provides.onScroll.subscribe((metrics) => {
      const current = metrics.currentPage
      const pm = metrics.pageVisibilityMetrics.find((m) => m.pageNumber === current)
      if (!pm || !pdfStore.active) return
      pdfStore.setPageCoords(pdfStore.active, { x: pm.original.pageX, y: pm.original.pageY })
    })
    return () => {
      unsubChange()
      unsubScroll()
    }
  }, [scrollCap.provides, pdfStore.active])

  if (isLoading || !engine) {
    return (
          <p class='relative flex w-full px-2 py-1'>
            <ShinyText className='text-sm tracking-wide text-slate-600'>
              Initializing PDF engine
            </ShinyText>
            <span class='dot-flashing top-3.5 left-2' />
          </p>
    )
  }
  return (
    <>
      <div style={{ height: '100%', minHeight: 420, overflow: 'scroll' }}>
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
    </>
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let revoke: string | null = null
    const load = async () => {
      if (!pdf.open || !pdf.active) return
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
        console.log('e', e)
        setError(e?.message || 'Failed to load PDF')
      } finally {
      }
    }
    load()
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [pdf.open, pdf.active])

  if (!pdf.open) return null
  const activePdf = pdf.tabs.find((t) => t.attachmentId === pdf.active)
  console.log('error panel', error, activePdf)

  const onTabChange = (tabId: string) => pdf.setActive(tabId)
  const onTabClose = (tabId: string) => pdf.closeTab(tabId)
  return (
    <div className='pointer-events-auto z-10 flex h-full w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/10 to-black/10 py-px shadow-2xl shadow-black/25 backdrop-blur-md'>
      <div className='flex flex-col'>
        <ol className='relative flex px-2 text-sm select-none'>
          <li className='mr-auto flex'>
            <p className='font-display flex w-full items-center justify-between font-medium text-slate-500 truncate'>
              <Icon icon='file-type-pdf' className='mr-1 w-4 h-4' />
                {'View and annotate PDFs'}
            </p>
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
            {pdf.active && activePdf?.numPages && (
              <div className='text-[11px] text-slate-400'>
                Page <span class='text-slate-300'>{activePdf?.page}</span> of{' '}
                {activePdf?.numPages}
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
        <Tabs tabs={pdf.tabs} onTabChange={onTabChange} onTabClose={onTabClose} activeTabId={pdf?.active ?? ''} />
      </div>
      <div className='relative z-0 overflow-x-scroll'>
        <PDFViewer
          blobUrl={blobUrl ?? ''}
          page={activePdf?.page ?? 1}
          coords={activePdf?.pageCoords}
          onNumPages={(n) => pdf.active && pdf.setNumPages(pdf.active, n)}
        />
      </div>
    </div>
  )
}
