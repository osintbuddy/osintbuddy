import { memo, useState } from 'preact/compat'
import { Icon } from '@/components/icons'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '@/app/store'
import { BASE_URL } from '@/app/baseApi'
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

  const updateValue = (event: HTMLFileEvent) => {
    if (event?.target?.files && event.target.files?.length > 0) {
      const file = event.target.files[0]
      // Optional type filter
      if (accept && file) {
        const okType = file.type === accept
        const okExt = accept === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf')
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
          const err = await resp.json().catch(() => ({ message: 'Upload failed.' }))
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
        .catch(() => {})
    }
  }

  return (
    <>
      <p className='whitespace-wrap font-display mt-1 ml-1 text-[0.5rem] font-semibold text-slate-400'>
        {label}
      </p>
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
