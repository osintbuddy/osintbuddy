import { memo, useState } from 'preact/compat'
import { Icon } from '@/components/icons'
import { useParams } from 'react-router-dom'
import {
  useAuthStore,
  usePdfViewerStore,
  useAudioViewerStore,
} from '@/app/store'
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
  const { accessToken: access_token } = useAuthStore()
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const { openViewer } = usePdfViewerStore()
  const { openViewer: openAudioViewer } = useAudioViewerStore()

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
      <p className='whitespace-wrap font-display mt-1 text-[0.5rem] font-semibold text-slate-400'>
        {label}
      </p>
      {/* Existing attachments */}
      <div className='mb-1 w-50'>
        {loading ? (
          <div className='text-[10px] text-slate-500'>Loading attachments…</div>
        ) : attachments.length > 0 ? (
          <ul className='flex w-full flex-col gap-y-1'>
            {attachments.map((a) => (
              <li
                key={a.attachment_id}
                className='flex items-center justify-between rounded-sm border border-slate-900 bg-black/20 pl-1 text-[10px] text-slate-400'
              >
                <span className='truncate'>{a.filename}</span>
                <span className='shrink-0'>
                  {a.media_type === 'application/pdf' && (
                    <button
                      title='Preview PDF'
                      className='group rounded-sm px-1 py-1 text-slate-400 transition-all duration-100 hover:text-slate-200'
                      onClick={() => openViewer(a.attachment_id, a.filename)}
                    >
                      <Icon
                        icon='eye'
                        className='group-hover:text-primary-350 h-3.5 w-3.5 transition-all duration-100'
                      />
                    </button>
                  )}
                  {a.media_type?.startsWith('audio/') && (
                    <button
                      title='Preview Audio'
                      className='hover:border-primary-350 group ml-1 px-1 py-1 text-slate-400 transition-all duration-100 hover:text-slate-200'
                      onClick={() =>
                        openAudioViewer(a.attachment_id, a.filename)
                      }
                    >
                      <Icon
                        icon='player-play'
                        className='group-hover:text-primary-350 h-3.5 w-3.5 transition-all duration-100'
                      />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className='text-[10px] text-slate-600'>No attachments yet.</div>
        )}
      </div>
      <div className='hover:border-mirage-200/50 focus-within:!border-primary-350 border-mirage-200/30 relative flex w-full items-center justify-between rounded-sm border bg-gradient-to-br from-black/10 to-black/35 pl-0.5 text-sm leading-4 text-slate-400 shadow-sm transition-colors duration-75 ease-in-out focus-within:bg-gradient-to-l focus-within:from-black/45 focus-within:to-black/20'>
        <Icon
          icon={icon}
          className='pointer-events-none absolute right-0.5 h-4 w-4 text-slate-900'
        />
        <label
          for={`${id}-${label}`}
          className={`ml-0.5 py-0.5 text-xs ${value?.name && 'text-slate-400'}`}
        >
          <input
            name={label}
            data-label={label}
            id={`${id}-${label}`}
            type='file'
            accept={accept}
            className='nodrag py-[3px] pr-5 pl-1 font-sans text-inherit transition-colors duration-100 ease-in placeholder:text-slate-800 focus:ring-0 focus:outline-hidden'
            onChange={(event: any) => updateValue(event)}
          />
          {value?.name ? value.name : label}
        </label>
      </div>
    </>
  )
}

export default memo(UploadFileInput)
