import { DropdownInput } from '../elements/DropdownInput'
import { TextInput } from '../elements/TextInput'
import { UploadFileInput } from '../elements/FileInput'
import { Title } from '../elements/Title'
import { TextArea } from '../elements/TextArea'
import { Text } from '../elements/Text'
import { CopyText } from '../elements/CopyText'
import { memo } from 'preact/compat'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'
import { NodeInputProps } from '@/types/graph'

interface ElementProps {
  id: string
  sendJsonMessage: SendJsonMessage
  element: NodeInputProps
  key: string
  data: any
}

export function Element({
  id,
  sendJsonMessage,
  element,
  key,
  data,
}: ElementProps) {
  const { label, value, icon, options = [] } = element
  switch (element.type) {
    case 'dropdown':
      return (
        <DropdownInput
          key={key}
          id={id}
          options={options || []}
          label={label}
          value={value ?? ''}
          data={data}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'text':
      return (
        <TextInput
          data={data}
          key={key}
          id={id}
          label={label}
          value={value ?? ''}
          icon={icon ?? 'ballpen'}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'upload':
      return (
        <UploadFileInput
          key={key}
          id={id}
          label={label}
          value={value ?? ''}
          icon={icon ?? 'file-upload'}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'title':
      return <Title key={key} id={id} label={label} value={value || ''} />
    case 'section':
      return (
        <Text
          key={key}
          id={id}
          label={element?.label}
          value={element?.value || ''}
        />
      )
    case 'textarea':
      return (
        <TextArea
          data={data}
          key={key}
          id={id}
          label={label}
          value={value || ''}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'copy-text':
      return <CopyText key={key} id={id} label={label} value={value || ''} />
    case 'empty':
      return <input className='pointer-events-none h-0 bg-transparent' />
  }
}

export default memo(Element)
