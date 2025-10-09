import { useEffect, useMemo, useState } from 'preact/hooks'
import { Icon } from '@/components/icons'
import { useFlowStore, usePropertiesStore } from '@/app/store'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'

interface Row {
  id: string
  key: string
  value: string
  isNew?: boolean
}

interface PropertiesViewerProps {
  src: JSONObject
  sendJsonMessage: SendJsonMessage
}

function toDisplayValue(v: any): string {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch (_) {
    return String(v)
  }
}

function parseValue(input: string): any {
  const trimmed = input.trim()
  if (trimmed === '') return ''
  // Heuristic parsing: JSON-like, numbers, booleans, null
  const isJsonish =
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null' ||
    /^-?\d+(?:\.\d+)?$/.test(trimmed)
  if (isJsonish) {
    try {
      return JSON.parse(trimmed)
    } catch (_) {
      // Fall back to string if invalid JSON
    }
  }
  return input
}

export default function PropertiesViewer({ src, sendJsonMessage }: PropertiesViewerProps) {
  const activeId = usePropertiesStore((s) => s.active)
  const [rows, setRows] = useState<Row[]>([])
  const HIDDEN_KEYS = useMemo(() => new Set(['label']), [])
  const PRESERVED_KEYS = HIDDEN_KEYS // keys we keep from base data even when removing others

  // Preserve list order: keep existing rows in place, update values, append new keys at the end
  useEffect(() => {
    const sanitized: Record<string, any> = {}
    Object.entries(src ?? {}).forEach(([k, v]) => {
      if (!HIDDEN_KEYS.has(k)) sanitized[k] = v
    })
    const srcKeys = Object.keys(sanitized)

    const filteredPrev = rows.filter((r) => {
      const k = r.key.trim()
      if (!k) return true // keep empty/new rows
      if (r.isNew) return true
      return Object.prototype.hasOwnProperty.call(sanitized, k)
    })
    const updatedPrev = filteredPrev.map((r) => {
      const k = r.key.trim()
      if (k && Object.prototype.hasOwnProperty.call(sanitized, k)) {
        const newVal = toDisplayValue(sanitized[k])
        if (newVal !== r.value) return { ...r, value: newVal }
      }
      return r
    })

    const known = new Set(updatedPrev.map((r) => r.key.trim()).filter(Boolean))
    const appended: Row[] = srcKeys
      .filter((k) => !known.has(k))
      .map((k, i) => ({ id: `${k}-${Date.now()}-${i}`, key: k, value: toDisplayValue(sanitized[k]) }))

    const nextRows = [...updatedPrev, ...appended]
    const same = (() => {
      if (nextRows.length !== rows.length) return false
      for (let i = 0; i < nextRows.length; i++) {
        if (nextRows[i].key !== rows[i].key || nextRows[i].value !== rows[i].value) {
          return false
        }
      }
      return true
    })()
    if (!same) setRows(nextRows)
  }, [activeId, src, HIDDEN_KEYS])

  const rowsToObject = (rs: Row[]) => {
    const out: Record<string, any> = {}
    for (const r of rs) {
      const k = r.key.trim()
      if (!k || HIDDEN_KEYS.has(k)) continue
      out[k] = parseValue(r.value)
    }
    return out
  }

  const asObject = useMemo(() => rowsToObject(rows), [rows, HIDDEN_KEYS])


  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, key: '', value: '', isNew: true },
    ])
  }

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id)
      // Immediately commit removal so entity update reflects property deletion
      commitRows(next)
      return next
    })
  }

  const updateKey = (id: string, key: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, key } : r)))
  }

  const updateValue = (id: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)))
  }

  // Commit rows to backend and store when a field loses focus (similar to EntityEditNode)
  // Entity updates happen via property removal: only preserved keys + current rows are sent
  const commitRows = (overrideRows?: Row[]) => {
    if (!activeId) return
    const node = useFlowStore.getState().nodes.find((n) => n.id === activeId)
    const baseData = (node?.data as Record<string, any>) || {}
    const current = overrideRows ?? rows
    const propsObject = rowsToObject(current)
    // Keep only preserved keys (e.g., label) from base, remove any others not present in rows
    const preservedData: Record<string, any> = {}
    Object.keys(baseData).forEach((k) => {
      if (PRESERVED_KEYS.has(k)) preservedData[k] = baseData[k]
    })
    const nextData = { ...preservedData, ...propsObject }
    try {
      sendJsonMessage({
        action: 'update:entity',
        entity: { id: activeId, data: nextData },
      })
    } catch (_) {}
    try {
      const st = usePropertiesStore.getState()
      const tab = st.tabs.find((t) => t.entityId === activeId)
      const currStr = JSON.stringify(tab?.data ?? {})
      const nextStr = JSON.stringify(nextData)
      if (currStr !== nextStr) st.setData(activeId, nextData)
    } catch (_) {}
  }

  return (
    <div className='flex flex-col '>
      <div className='grid grid-cols-12 gap-2'>
        <div className='col-span-4 text-xs text-slate-400 pb-1'>Property Label</div>
        <div className='col-span-8 text-xs text-slate-400 pb-1'>Value</div>
      </div>
      <div className='flex flex-col overflow-y-scroll'>
        {rows.length === 0 && (
          <div className='p-2 text-xs text-slate-500'>No properties. Add one.</div>
        )}
        {rows.filter((r) => !HIDDEN_KEYS.has(r.key.trim())).map((row) => (
          <div key={row.id} className='grid grid-cols-12 items-center relative'>
            <input
              value={row.key}
              onInput={(e) => updateKey(row.id, (e.currentTarget as HTMLInputElement).value)}
              onBlur={commitRows}
              placeholder='key'
              className='col-span-4 block w-full border-b border-slate-900 bg-transparent py-1 text-sm outline-hidden placeholder:text-slate-700 focus:border-b-primary'
            />
            <input
              value={row.value}
              onInput={(e) =>
                updateValue(row.id, (e.currentTarget as HTMLInputElement).value)
              }
              onBlur={() => commitRows()}
              placeholder='Property value'
              className='pl-1 col-span-8 block w-full border-l border-b border-slate-900 bg-transparent py-1 text-sm outline-hidden placeholder:text-slate-700 focus:border-b-primary'
            />
          <button title='Remove property' onClick={() => removeRow(row.id)} className="bg-black/20 absolute right-0 top-2">
            <Icon icon='trash' className="w-4 h-4 text-danger-500" />
          </button>
          </div>
        ))}
      </div>
      <div className='mt-2 flex items-center justify-end gap-2'>
        <button
          type='button'
          onClick={addRow}
          className='rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:text-slate-100'
        >
          Add Property
        </button>
      </div>
    </div>
  )
}
