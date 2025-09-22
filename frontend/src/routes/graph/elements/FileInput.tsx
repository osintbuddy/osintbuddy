import { memo, useState } from 'preact/compat'
import { Icon } from '@/components/icons'
import { useParams } from 'react-router-dom'
import { useAuthStore, usePdfViewerStore } from '@/app/store'
import { BASE_URL } from '@/app/baseApi'
import { entitiesApi, type AttachmentItem } from '@/app/api'
import { useEffect } from 'preact/hooks'
import { toast } from 'react-toastify'

export interface HTMLFileEvent extends Event {
  target: HTMLInputElement & EventTarget
}

interface FileInputProps {
  id: string
  label: string
  value: string
  sendJsonMessage: (data: any) => void
  icon?: any
  accept?: string
}

export function UploadFileInput({
  id,
  value: initialValue,
  label,
  sendJsonMessage,
  icon,
  accept,
}: FileInputProps) {
  const [value, setValue] = useState<File>(initialValue as any)
  const { hid } = useParams()
  const { access_token } = useAuthStore()
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const { openViewer } = usePdfViewerStore()

  const fetchAttachments = async () => {
    if (!hid) return
    try {
      setLoading(true)
      const items = await entitiesApi.listAttachments(
        String(hid),
        id,
        access_token as string
      )
      setAttachments(items)
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttachments()
  }, [hid, id])

  const updateValue = (event: HTMLFileEvent) => {
    if (event?.target?.files && event.target.files?.length > 0) {
      const file = event.target.files[0]
      // Optional type filter
      if (accept && file) {
        const okType = file.type === accept
        const okExt =
          accept === 'application/pdf' &&
          file.name.toLowerCase().endsWith('.pdf')
        if (!okType && !okExt) {
          toast.error(`Invalid file type. Expected ${accept}.`)
          return
        }
      }
      setValue(file)
      // Upload to API as entity attachment
      const form = new FormData()
      form.append('graph_id', String(hid))
      form.append('entity_id', id)
      form.append('file', file)
      form.append('meta', JSON.stringify({ label }))

      const upload = async () => {
        const resp = await fetch(`${BASE_URL}/entities/attachments`, {
          method: 'POST',
          body: form,
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
        if (!resp.ok) {
          const err = await resp
            .json()
            .catch(() => ({ message: 'Upload failed.' }))
          throw new Error(err?.message || 'Upload failed')
        }
        return await resp.json()
      }
      toast
        .promise(upload(), {
          pending: 'Uploading attachment...',
          success: 'Attachment uploaded!',
          error: 'Failed to upload attachment',
        })
        .then(() => fetchAttachments())
        .catch(() => {})
    }
  }

  return (
    <>
      <p className='whitespace-wrap font-display mt-1 ml-1 text-[0.5rem] font-semibold text-slate-400'>
        {label}
      </p>
      {/* Existing attachments */}
      <div className='mb-1 ml-1 w-64'>
        {loading ? (
          <div className='text-[10px] text-slate-500'>Loading attachments…</div>
        ) : attachments.length > 0 ? (
          <ul className='space-y-0.5'>
            {attachments.map((a) => (
              <li
                key={a.attachment_id}
                className='flex items-center justify-between text-[10px] text-slate-400'
              >
                <span className='truncate'>{a.filename}</span>
                <span className='shrink-0 space-x-1'>
                  <button
                    title='Preview'
                    className='rounded border border-slate-800 px-1 py-0.5 text-slate-400 hover:text-slate-200'
                    onClick={() => openViewer(a.attachment_id, a.filename)}
                  >
                    <Icon icon='eye' className='h-3.5 w-3.5' />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className='text-[10px] text-slate-600'>No attachments yet.</div>
        )}
      </div>
      <div className='flex items-center'>
        <div className='node-field'>
          <Icon icon={icon} className='h-6 w-6' />
          <label className={`ml-5 w-52 ${value?.name && 'text-slate-400'}`}>
            <input
              data-label={label}
              id={`${id}-${label}`}
              type='file'
              accept={accept}
              className='nodrag'
              onChange={(event: any) => updateValue(event)}
            />
            {value?.name ? value.name : label}
          </label>
        </div>
      </div>
    </>
  )
}

export default memo(UploadFileInput)
