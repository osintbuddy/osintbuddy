import DropdownInput from '../elements/DropdownInput'
import { TextInput } from '../elements/TextInput'
import { UploadFileInput } from '../elements/FileInput'
import { Title } from '../elements/Title'
import { TextArea } from '../elements/TextArea'
import { Text } from '../elements/Text'
import { CopyText } from '../elements/CopyText'
import { memo } from 'preact/compat'
import { ElementProps } from '@/types/graph'

function Element({ id, sendJsonMessage, element, key }: ElementProps) {
  switch (element.type) {
    case 'dropdown':
      return (
        <DropdownInput
          key={key}
          nodeId={id}
          options={element.options || []}
          label={element.label}
          value={element.value as string}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'text':
      return (
        <TextInput
          key={key}
          nodeId={id}
          label={element?.label}
          value={element.value}
          icon={element?.icon || 'ballpen'}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'upload':
      return (
        <UploadFileInput
          key={key}
          nodeId={id}
          label={element?.label}
          initialValue={element?.value || ''}
          icon={element?.icon || 'file-upload'}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'title':
      return (
        <Title
          key={key}
          nodeId={id}
          label={element?.label}
          value={element?.value || ''}
        />
      )
    case 'section':
      return (
        <Text
          key={key}
          nodeId={id}
          label={element?.label}
          value={element?.value || ''}
        />
      )
    case 'textarea':
      return (
        <TextArea
          key={key}
          nodeId={id}
          label={element?.label}
          value={element?.value || ''}
          sendJsonMessage={sendJsonMessage}
        />
      )
    case 'copy-text':
      return (
        <CopyText
          key={key}
          nodeId={id}
          label={element?.label}
          value={element?.value || ''}
        />
      )
    case 'empty':
      return <input className='pointer-events-none h-0 bg-transparent' />
  }
}
export const NodeElement = memo(Element)
