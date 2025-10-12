import { Icon } from '@/components/icons'

interface TabsProps {
  activeTabId: string
  tabs: any[]
  onTabChange: (tabId: string) => void
  onTabClose: (tabId: string) => void
}

export default function Tabs({ activeTabId, tabs, onTabChange, onTabClose }: TabsProps) {
  const onTabScroll = (e: WheelEvent) => {
    const el = e.currentTarget as HTMLDivElement
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
  }

  return (
    <header
      className='relative z-10 pb-1 flex flex-nowrap overflow-x-hidden'
      onWheel={onTabScroll}
    >
      {tabs.map((t) => (
        <div
          key={t.attachmentId}
          onClick={() => { 
            if (t.attachmentId !== activeTabId)
              onTabChange(t.attachmentId)
          }}
          className={`flex items-center border-slate-900 border-b-3 py-1.5 text-xs group ${
            activeTabId === t.attachmentId
              ? 'bg-black text-slate-300 !border-primary-300'
              : 'bg-slate-950/30 text-slate-400 '
          }`}
        >
          <p
            className='text-left px-1.5 whitespace-nowrap'
          >
            {t.filename || 'PDF'}
          </p>
          <button
            title='Close tab'
            onClick={() => onTabClose(t.attachmentId)}
            className='p-0.5 hover:bg-danger-500/60 rounded-xs text-transparent group-hover:text-slate-300'
          >
            <Icon icon='x' className='h-3.5 w-3.5' />
          </button>
        </div>
      ))}
    </header>
  )
}
