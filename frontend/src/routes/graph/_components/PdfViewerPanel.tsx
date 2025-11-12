import { Dispatch, StateUpdater, useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useAuthStore, usePdfViewerStore } from '@/app/store'
import { BASE_URL } from '@/app/baseApi'
import { Icon } from '@/components/icons'
import { createPluginRegistration } from '@embedpdf/core'
import { useCapability } from '@embedpdf/core/react'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import {
  AnnotationCapability,
  AnnotationPluginPackage,
  TrackedAnnotation,
} from '@embedpdf/plugin-annotation'
import {
  AnnotationLayer,
  useAnnotationCapability,
} from '@embedpdf/plugin-annotation/react'
import { HistoryPluginPackage } from '@embedpdf/plugin-history'
import {
    useViewportCapability,
  Viewport,
  ViewportMetrics,
  ViewportPluginPackage,
} from '@embedpdf/plugin-viewport/react'
import {
  ZoomPluginPackage,
  ZoomMode,
  useZoom,
  MarqueeZoom,
} from '@embedpdf/plugin-zoom/react'
import {
  PagePointerProvider,
  InteractionManagerPluginPackage,
  GlobalPointerProvider,
} from '@embedpdf/plugin-interaction-manager/react'
import {
  RenderPageProps,
  Scroller,
  ScrollPluginPackage,
  useScroll,
} from '@embedpdf/plugin-scroll/react'
import {
  RedactionPluginPackage,
  RedactionLayer,
  useRedaction,
} from '@embedpdf/plugin-redaction/react'
import {
  SelectionPluginPackage,
  SelectionLayer,
  useSelectionCapability,
  SelectionRangeX,
} from '@embedpdf/plugin-selection/react'
import {
  ExportPluginPackage,
  useExportCapability,
} from '@embedpdf/plugin-export/react'
import {
  SpreadPluginPackage,
  SpreadMode,
  useSpread,
} from '@embedpdf/plugin-spread/react'
import {
  CaptureAreaEvent,
  CapturePluginPackage,
  MarqueeCapture,
  useCaptureCapability,
} from '@embedpdf/plugin-capture/react'
import { PanPluginPackage, usePan } from '@embedpdf/plugin-pan/react'
import { TilingLayer, TilingPluginPackage } from '@embedpdf/plugin-tiling/react'
import { ThumbnailPluginPackage } from '@embedpdf/plugin-thumbnail/react'
import { LoaderPluginPackage } from '@embedpdf/plugin-loader/react'
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react'
import type { LoaderPlugin } from '@embedpdf/plugin-loader'
import type { ScrollPlugin } from '@embedpdf/plugin-scroll'
import ShinyText from '@/components/ShinyText'
import Tabs from './Tabs'
import Button from '@/components/buttons'
import { ThumbnailsPane, ThumbImg } from '@embedpdf/plugin-thumbnail/react'
import { MenuWrapperProps } from '@embedpdf/utils/react'

interface ThumbnailSidebarProps {
  showThumbnailBar: boolean
}

function ThumbnailSidebar({ showThumbnailBar }: ThumbnailSidebarProps) {
  const { state, provides } = useScroll()
  if (!showThumbnailBar) return null
  return (
    <ThumbnailsPane className='z-20 w-20 bg-black/60'>
      {(m) => {
        const isActive = state.currentPage === m.pageIndex + 1
        return (
          <div
            key={m.pageIndex}
            style={{
              position: 'absolute',
              top: m.top,
              height: m.wrapperHeight,
            }}
            onClick={() =>
              provides?.scrollToPage({ pageNumber: m.pageIndex + 1 })
            }
          >
            <div
              style={{
                border: `2px solid ${isActive ? 'blue' : 'grey'}`,
                width: m.width,
                height: m.height,
              }}
            >
              <ThumbImg meta={m} />
            </div>
            <span style={{ height: m.labelHeight }}>{m.pageIndex + 1}</span>
          </div>
        )
      }}
    </ThumbnailsPane>
  )
}

interface AnnotationsSelectionMenuProps {
  menuWrapperProps: MenuWrapperProps
}

function AnnotationsSelectionMenu({
  menuWrapperProps,
}: AnnotationsSelectionMenuProps) {
  const { provides: annotationApi } = useAnnotationCapability();
  const { provides: viewportApi } = useViewportCapability();

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const [pageHeight, setPageHeight] = useState<number | null>(null);

  // Calculates the position of the selection menu relative to the annotation itself and the viewport size
  const selectionMenuPosition = useMemo(
    () => {
      const annotationWidth: number = menuWrapperProps.style.width as number
      const annotationLeft: number = menuWrapperProps.style.left as number
      const annotationHeight: number = menuWrapperProps.style.height as number
      const annotationTop: number = menuWrapperProps.style.top as number

      if (!menuContainerRef.current || !pageHeight) 
        return { x: annotationLeft, y: annotationTop }

      const menuContainerHeight: number = menuContainerRef.current.clientHeight
      const maxPixelOverflow = 5;
      const realHeight = annotationHeight + annotationTop + menuContainerHeight - maxPixelOverflow;

      let top;

      if (pageHeight <= realHeight) {
        top = realHeight - annotationHeight - menuContainerHeight * 2
      }
      else {
        top = annotationHeight + annotationTop
      }

      const offsetToCenter = menuContainerRef.current.clientWidth / 2
      const left = annotationLeft + (annotationWidth / 2) - offsetToCenter

      return { x: left, y: top }
    },
    [menuWrapperProps, menuContainerRef, pageHeight]
  )

  const [selectionMenuPositionStyle, setSelectionMenuPositionStyle] = useState<{ transform: string }>({
    transform: `translate(${selectionMenuPosition.x}px, ${selectionMenuPosition.y}px)`,
  })

  useEffect(() => {
    if (!viewportApi) return

    // Initial page height
    setPageHeight(viewportApi?.getMetrics().clientHeight)

    // Update page height on viewport resize
    const unsubscribe = viewportApi?.onViewportResize((newSize: ViewportMetrics) => {
      setPageHeight(newSize.clientHeight)
    })

    return () => unsubscribe()
  }, [viewportApi])

  useEffect(() => {
    setSelectionMenuPositionStyle({
      transform: `translate(${selectionMenuPosition.x}px, ${selectionMenuPosition.y}px)`,
    })
  }, [selectionMenuPosition])

 
  const deleteSelectedAnnotation = () => {
    const selection = annotationApi?.getSelectedAnnotation();
    if (selection) {
      annotationApi?.deleteAnnotation(selection.object.pageIndex, selection.object.id);
    }
  }

  return (
    <>
      <div 
        ref={menuContainerRef}
        className='absolute left-0 top-0'
        style={selectionMenuPositionStyle}
      >
        <div className='p-1 bg-mirage-950 rounded-lg'>
          <Button.Icon
            variant='annotationsSelectionMenuDanger'
            title='Remove annotation'
            onClick={deleteSelectedAnnotation}
          >
            <Icon icon='trash' className='h-5 w-5' />
          </Button.Icon>
        </div>
      </div>
    </>
  )
}

interface PDFAnnotationsToolbarProps {
  showAnnotationsToolbar: boolean
  setShowAnnotationsToolbar: Dispatch<StateUpdater<boolean>>
}

function PDFAnnotationsToolbar({
  showAnnotationsToolbar,
  setShowAnnotationsToolbar,
}: PDFAnnotationsToolbarProps) {
  const { provides: annotationApi } = useAnnotationCapability()
  const [activeToolId, setActiveToolId] = useState<string | null>(null)

  // Keep track of the active tool id state
  useEffect(() => {
    if (!annotationApi) return
    annotationApi?.onStateChange((state) => setActiveToolId(state.activeToolId))
  }, [annotationApi])

  // When we toggle annotations toolbar, unset the active tool 
  useEffect(() => {
    if (!annotationApi) return

    setActiveToolId(null);
    annotationApi?.setActiveTool(null);
    annotationApi?.deselectAnnotation();
  }, [showAnnotationsToolbar])

  // Hide annotations toolbar when the component unmounts. Needed when user switches tabs
  useEffect(() => {
    return () => setShowAnnotationsToolbar(false)
  }, [])

  // Toggles active tool
  const toggleActiveTool = useCallback(
    (toolId: string) => {
      if (!annotationApi) return

      // If there's no active tool or the new tool id is different
      if (!activeToolId || activeToolId !== toolId) {
        annotationApi?.setActiveTool(toolId)
      }
      // Current tool id is the same as the new tool id
      else {
        annotationApi?.setActiveTool(null)
      }
    },
    [activeToolId, annotationApi]
  );

  return (
    <>
      { showAnnotationsToolbar && (
        <div className='absolute top-8.5 left-0 z-40 flex w-full justify-center text-slate-400'>
          <section className='relative z-40 flex w-fit items-center justify-between bg-slate-950/99 py-0.5 transition-all duration-150 ease-out'>
            <div className='flex items-center'>
              <Button.Icon
                variant={
                  activeToolId === 'highlight'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Highlight text'
                onClick={() => toggleActiveTool('highlight')}
              >
                <Icon icon='annotation-highlight' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'underline'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Underline text'
                onClick={() => toggleActiveTool('underline')}
              >
                <Icon icon='annotation-underline' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'strikeout'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Strikethrough text'
                onClick={() => toggleActiveTool('strikeout')}
              >
                <Icon icon='annotation-strikethrough' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'squiggly'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Squiggly text'
                onClick={() => toggleActiveTool('squiggly')}
              >
                <Icon icon='annotation-squiggly' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'ink'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Freehand'
                onClick={() => toggleActiveTool('ink')}
              >
                <Icon icon='annotation-freehand' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'circle'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Circle'
                onClick={() => toggleActiveTool('circle')}
              >
                <Icon icon='annotation-circle' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'square'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Square'
                onClick={() => toggleActiveTool('square')}
              >
                <Icon icon='annotation-square' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'line'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Line'
                onClick={() => toggleActiveTool('line')}
              >
                <Icon icon='annotation-line' className={`h-5 w-5`} />
              </Button.Icon>

              <Button.Icon
                variant={
                  activeToolId === 'lineArrow'
                    ? 'annotationsToolbarSelected'
                    : 'annotationsToolbar'
                }
                title='Arrow'
                onClick={() => toggleActiveTool('lineArrow')}
              >
                <Icon icon='annotation-arrow' className={`h-5 w-5`} />
              </Button.Icon>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

interface PDFToolbarProps {
  showThumbnailBar: boolean
  setShowThumbnailBar: Dispatch<StateUpdater<boolean>>
  showAnnotationsToolbar: boolean
  setShowAnnotationsToolbar: Dispatch<StateUpdater<boolean>>
  activeFilename: string
}

function PDFToolbar({
  showThumbnailBar,
  setShowThumbnailBar,
  showAnnotationsToolbar,
  setShowAnnotationsToolbar,
  activeFilename,
}: PDFToolbarProps) {
  const { provides: zoom, state: zoomState } = useZoom()
  const { provides: pan, isPanning } = usePan()
  const { provides: redact, state: redactState } = useRedaction()
  const { provides: selection } = useSelectionCapability()
  const { provides: exportApi } = useExportCapability()
  const { provides: spread, spreadMode } = useSpread()
  const { provides: capture } = useCaptureCapability()
  const isCaptureActive = capture?.isMarqueeCaptureActive()

  const [hasSelection, setHasSelection] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)

  if (!zoom || !pan || !redact || !spread) return null

  const [isAreaZoomActive, setIsAreaZoomActive] = useState(
    zoom.isMarqueeZoomActive()
  )

  useEffect(() => {
    if (!selection) return
    return selection.onSelectionChange((sel: SelectionRangeX | null) => {
      setHasSelection(!!sel)
    })
  }, [selection])

  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Download images on capture
  useEffect(() => {
    if (!capture) return

    const unsubscribe = capture.onCaptureArea((result: CaptureAreaEvent) => {
      const newUrl = URL.createObjectURL(result.blob)
      setImageUrl(newUrl)
      const link = document.createElement('a')
      link.href = newUrl
      link.setAttribute(
        'download',
        `${Date.now()}_${activeFilename.replace('.pdf', '')}.png`
      )
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    })

    return () => {
      unsubscribe()
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [capture])

  return (
    <>
      <div className='absolute top-0 left-0 z-40 flex w-full items-center text-slate-400'>
        <button
          onClick={() => {
            setShowToolbar(!showToolbar)
            setShowAnnotationsToolbar(false); // Hide annotations toolbar on toggle
          }}
          class='bg-mirage-950 hover:text-slate-350 active:text-slate-350 hover:*:animate-wiggle group absolute top-0 right-0 z-50 ml-auto rounded-sm p-1 text-slate-400'
          aria-pressed={showToolbar}
        >
          <Icon
            aria-pressed={showToolbar}
            icon='chevron-left'
            className='h-5 w-5 rotate-0 transition-all duration-100 aria-pressed:rotate-180'
          />
        </button>
        {/* Expandable pdf controls section */}
        <section
          aria-hidden={!showToolbar}
          aria-expanded={showToolbar}
          className='relative z-40 flex w-full items-center justify-between bg-slate-950/99 py-0.5 transition-all duration-150 ease-out aria-expanded:left-full aria-expanded:-translate-x-full aria-hidden:left-full'
        >
          {/* Thumbnail toggle control */}
          <div className='flex items-center'>
            <Button.Icon
              variant='toolbar'
              title='Click to toggle PDF thumbnails'
              onClick={() => {
                setShowThumbnailBar(!showThumbnailBar)
                if (!showThumbnailBar)
                  zoom.requestZoom(zoomState.currentZoomLevel - 0.11)
                else zoom.requestZoom(zoomState.currentZoomLevel + 0.11)
              }}
            >
              {showThumbnailBar ? (
                <Icon icon='layout-sidebar-left-collapse' />
              ) : (
                <Icon icon='layout-sidebar-left-expand' />
              )}
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              title='Click toggles two-page odd view. Double click toggles two-page even view'
              onClick={() => {
                if (spreadMode === SpreadMode.None)
                  spread.setSpreadMode(SpreadMode.Odd)
                else spread.setSpreadMode(SpreadMode.None)
              }}
              onDblClick={() => {
                if (spreadMode === SpreadMode.Even)
                  spread.setSpreadMode(SpreadMode.None)
                else spread.setSpreadMode(SpreadMode.Even)
              }}
            >
              {spreadMode !== SpreadMode.None ? (
                <Icon icon='book' className='text-primary-300 h-5 w-5' />
              ) : (
                <Icon icon='book-2' />
              )}
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              title='Click to toggle pan mode'
              onClick={pan.togglePan}
            >
              {isPanning ? (
                <Icon icon='hand-off' className='text-primary-300 h-5 w-5' />
              ) : (
                <Icon icon='hand-stop' />
              )}
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              onClick={() => capture?.toggleMarqueeCapture()}
              title='Capture a selected region on this pdf as an image'
            >
              {isCaptureActive ? (
                <Icon icon='maximize-off' className='text-danger-500 h-5 w-5' />
              ) : (
                <Icon icon='screenshot' />
              )}
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              onClick={() => selection?.copyToClipboard()}
              disabled={!hasSelection}
              title='Copy selected text'
            >
              <Icon icon='copy' />
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              onClick={() => exportApi?.download()}
              disabled={!exportApi}
              title='Export this PDF'
            >
              <Icon icon='download' />
            </Button.Icon>
          </div>
          {/* Zoom controls */}
          <div className='flex items-center gap-x-1'>
            <Button.Icon
              variant='toolbar'
              title='Click once to reset zoom. Double click to set zoom to 50%'
              onClick={() => zoom.requestZoom(1.0)}
              onDblClick={() => zoom.requestZoom(0.5)}
            >
              <Icon icon='zoom-reset' />
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              title='Zoom out'
              onClick={zoom.zoomOut}
            >
              <Icon icon='zoom-out' />
            </Button.Icon>
            <input
              className='bg-mirage-950 hover:text-slate-350 focus:text-slate-350 focus:border-primary-350 hover:border-primary-350 w-10 rounded-sm border border-slate-900 p-1.5 text-xs outline-none focus:bg-transparent'
              type='text'
              value={Math.round(zoomState.currentZoomLevel * 100) + '%'}
            />
            <Button.Icon
              variant='toolbar'
              onClick={zoom.zoomIn}
              title='Zoom in'
            >
              <Icon icon='zoom-in' />
            </Button.Icon>
            <Button.Icon
              title='Toggle area zoom'
              variant='toolbar'
              onClick={() => {
                zoom.toggleMarqueeZoom()
                setIsAreaZoomActive(!isAreaZoomActive)
              }}
              aria-pressed={isAreaZoomActive}
            >
              {isAreaZoomActive ? (
                <Icon icon='zoom-cancel' className='text-primary-300 h-5 w-5' />
              ) : (
                <Icon icon='zoom-in-area' className='h-5 w-5' />
              )}
            </Button.Icon>
          </div>
          <div className='mr-10 flex items-center'>
            <Button.Icon
              variant='toolbar'
              title='Open annotations toolbar'
              onClick={() => setShowAnnotationsToolbar(state => !state)}
            >
              <Icon
                icon='pencil-minus'
                className={`h-5 w-5 ${showAnnotationsToolbar ? 'text-primary-300' : ''}`}
              />
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              title='Redact selected text'
              onClick={() => redact?.toggleRedactSelection()}
            >
              <Icon
                icon='redact-selection'
                className={`h-5 w-5 ${redactState.activeType === 'redactSelection' && redactState.isRedacting && 'text-primary-300'}`}
              />
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              title='Mark redaction area'
              onClick={() => redact?.toggleMarqueeRedact()}
            >
              <Icon
                icon='background'
                className={`h-5 w-5 ${redactState.activeType === 'marqueeRedact' && redactState.isRedacting && 'text-primary-300'}`}
              />
            </Button.Icon>
            <Button.Icon
              variant='toolbar'
              title='Apply all redactions'
              onClick={() => redact?.commitAllPending()}
              disabled={redactState.pendingCount === 0}
            >
              <Icon
                icon='file-text-shield'
                className={`h-5 w-5 ${redactState.pendingCount > 0 && 'text-green-700'}`}
              />
            </Button.Icon>
            <span className='text-code ml-3' title='Total pending redactions'>
              {redactState.pendingCount}
            </span>
          </div>
        </section>
      </div>
      <ThumbnailSidebar showThumbnailBar={showThumbnailBar} />
    </>
  )
}

interface PDFViewerProps {
  blobUrl: string
  page: number
  coords?: { x: number; y: number }
  onNumPages?: (n: number) => void
  activeFilename: string
}

export const PDFViewer = ({
  blobUrl,
  page,
  coords,
  onNumPages,
  activeFilename,
}: PDFViewerProps) => {
  const pdfStore = usePdfViewerStore()
  const { engine, isLoading } = usePdfiumEngine()
  const [showThumbnailBar, setShowThumbnailBar] = useState(false)
  const [showAnnotationsToolbar, setShowAnnotationsToolbar] = useState(false);

  const plugins = useMemo(
    () => [
      createPluginRegistration(LoaderPluginPackage, {
        loadingOptions: {
          type: 'url',
          pdfFile: { id: pdfStore.active || 'active-pdf', url: blobUrl },
        },
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage, {
        initialPage: Math.max(1, page || 1),
      }),
      createPluginRegistration(RenderPluginPackage),
      // Required for PagePointerProvider and marquee zoom interactions
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitPage,
      }),
      createPluginRegistration(TilingPluginPackage, {
        tileSize: 768,
        overlapPx: 5,
        extraRings: 1,
      }),
      createPluginRegistration(ThumbnailPluginPackage, {
        width: 80,
      }),
      createPluginRegistration(PanPluginPackage),
      createPluginRegistration(RedactionPluginPackage, {
        drawBlackBoxes: true,
      }),
      createPluginRegistration(SelectionPluginPackage),
      createPluginRegistration(ExportPluginPackage, {
        defaultFileName: `${pdfStore.active?.slice(0, 8).toUpperCase()}_${activeFilename.replace('.pdf', '')}.pdf`,
      }),
      createPluginRegistration(SpreadPluginPackage, {
        defaultSpreadMode: SpreadMode.None,
      }),
      createPluginRegistration(CapturePluginPackage, {
        scale: 2.0, // Render captured image at 2x resolution
        imageType: 'image/png',
        withAnnotations: true,
      }),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage),
    ],
    [blobUrl]
  )

  const loaderCap = useCapability<LoaderPlugin>('loader')
  const scrollCap = useCapability<ScrollPlugin>('scroll')
  

  // Load/reload document ONLY when the blob changes, avoids unwanted reloads on graph interactions
  // Loader capability is never ready. Known bug: https://github.com/embedpdf/embed-pdf-viewer/issues/229
  useEffect(() => {
    if (!blobUrl) return
    if (!loaderCap.provides) return
    loaderCap.provides
      .loadDocument({
        type: 'url',
        pdfFile: { id: pdfStore.active || 'active-pdf', url: blobUrl },
      })
      .then(() => {
        // TODO: Fix me
        // Best-effort restore of position if available (won't trigger reloads)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobUrl, loaderCap.provides])

  // TODO: Fix me.
  // Subscribe for document loaded -> set num pages and restore scroll
  useEffect(() => {
    if (!loaderCap.provides) return
    const unsub = loaderCap.provides.onDocumentLoaded.subscribe((doc) => {
      const n = doc?.pageCount ?? 0
      if (n > 0 && pdfStore.active) {
        onNumPages?.(n) // Sets number of pages for the active pdf document
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
  }, [
    loaderCap.provides,
    scrollCap.provides,
    page,
    coords?.x,
    coords?.y,
    pdfStore.active,
  ])

  // TODO: Fix me.
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

  // TODO: Fix me.
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

  // TODO: Fix me. Reflect page + per-page coordinates back to store when user scrolls
  useEffect(() => {
    if (!scrollCap.provides || !pdfStore.active) return

    const unsubChange = scrollCap.provides.onPageChange.subscribe(
      ({ pageNumber }) => {
        if (pdfStore.active) pdfStore.setPage(pdfStore.active, pageNumber)
      }
    )

    const unsubScroll = scrollCap.provides.onScroll.subscribe((metrics) => {
      const current = metrics.currentPage
      const pm = metrics.pageVisibilityMetrics.find(
        (m) => m.pageNumber === current
      )
      if (!pm || !pdfStore.active) return
      pdfStore.setPageCoords(pdfStore.active, {
        x: pm.original.pageX,
        y: pm.original.pageY,
      })
    })

    return () => {
      unsubChange()
      unsubScroll()
    }
  }, [scrollCap.provides, pdfStore.active])

  if (isLoading || !engine) {
    return (
      <p class='relative flex w-full px-2 py-1'>
        <ShinyText className='tracking-wide text-slate-600'>
          Initializing PDF engine
        </ShinyText>
        <span class='dot-flashing top-3.5 left-2' />
      </p>
    )
  }

  return (
    <>
      <div className='h-full overflow-x-scroll'>
        <EmbedPDF engine={engine} plugins={plugins}>
          <PDFToolbar
            activeFilename={activeFilename}
            showAnnotationsToolbar={showAnnotationsToolbar}
            setShowAnnotationsToolbar={setShowAnnotationsToolbar}
            showThumbnailBar={showThumbnailBar}
            setShowThumbnailBar={setShowThumbnailBar}
          />
          <PDFAnnotationsToolbar
            showAnnotationsToolbar={showAnnotationsToolbar}
            setShowAnnotationsToolbar={setShowAnnotationsToolbar}
          />

          <GlobalPointerProvider>
            <Viewport
              className={`absolute top-0 bg-transparent ${showThumbnailBar && 'left-10'}`}
            >
              <Scroller
                renderPage={({
                  width,
                  height,
                  pageIndex,
                  scale,
                  rotation,
                }: RenderPageProps) => (
                  <PagePointerProvider
                    pageIndex={pageIndex}
                    pageWidth={width}
                    pageHeight={height}
                    rotation={rotation}
                    scale={scale}
                  >
                    <RenderLayer pageIndex={pageIndex} scale={0.5} />
                    <TilingLayer pageIndex={pageIndex} scale={scale} />
                    <SelectionLayer pageIndex={pageIndex} scale={scale} />
                    <AnnotationLayer
                      pageIndex={pageIndex}
                      pageWidth={width}
                      pageHeight={height}
                      rotation={rotation}
                      scale={scale}
                      selectionMenu={({ selected, menuWrapperProps }) => (
                          <>
                            { selected ? (
                              <AnnotationsSelectionMenu menuWrapperProps={menuWrapperProps} />
                            ): null}
                          </>
                      )}
                    />
                    <RedactionLayer
                      pageIndex={pageIndex}
                      scale={scale}
                      rotation={rotation}
                    />
                    <MarqueeZoom pageIndex={pageIndex} scale={scale} />
                    <MarqueeCapture pageIndex={pageIndex} scale={scale} />
                  </PagePointerProvider>
                )}
              />
            </Viewport>
          </GlobalPointerProvider>
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

  useEffect(() => {
    let revoke: string | null = null

    const load = async () => {
      if (!pdf.open || !pdf.active) return

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
      } catch (err) {
        console.error(err)
      }
    }

    load()

    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [pdf.open, pdf.active])

  const activePdf = pdf.tabs.find((t) => t.attachmentId === pdf.active)

  const onTabChange = (tabId: string) => pdf.setActive(tabId)
  const onTabClose = (tabId: string) => pdf.closeTab(tabId)

  if (!pdf.open) return null

  return (
    <div className='pointer-events-auto z-10 flex h-full w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/10 to-black/10 py-px shadow-2xl shadow-black/25 backdrop-blur-md'>
      <div className='flex flex-col'>
        <ol className='relative flex px-2 text-sm select-none'>
          <li className='mr-auto flex'>
            <h2 className='font-display flex w-full items-center justify-between truncate font-medium text-slate-500'>
              <Icon icon='file-type-pdf' className='mr-1 h-4 w-4' />
              <span>View and annotate PDFs</span>
            </h2>
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
            <button
              onClick={() => pdf.closeViewer()}
              className='hover:text-alert-700 font-display t whitespace-nowrap text-slate-800'
              title='Close preview'
            >
              <Icon icon='x' className='h-5 w-5 text-inherit' />
            </button>
          </li>
        </ol>
        <Tabs
          tabs={pdf.tabs}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
          activeTabId={pdf?.active ?? ''}
        />
      </div>
      <div className='relative z-0 h-full'>
        <PDFViewer
          activeFilename={activePdf?.filename ?? 'unknown.pdf'}
          blobUrl={blobUrl ?? ''}
          page={activePdf?.page ?? 1}
          coords={activePdf?.pageCoords}
          onNumPages={(n) => pdf.active && pdf.setNumPages(pdf.active, n)}
        />
      </div>
    </div>
  )
}
