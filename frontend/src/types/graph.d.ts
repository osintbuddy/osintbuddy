import { CSSProperties } from 'preact/compat'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'

interface DropdownOptionProps {
  label: string
  tooltip: string
  value: string
}

type NodeTypes =
  | 'dropdown'
  | 'text'
  | 'upload'
  | 'title'
  | 'section'
  | 'textarea'
  | 'copy-text'
  | 'empty'

interface NodeInputProps {
  type: NodeTypes
  label: string
  style: CSSProperties
  placeholder: string
  options?: DropdownOptionProps[]
  value?: string
  icon?: any
  title?: string
  subtitle?: string
  text?: string
  dispatch: () => void
  sendJsonMessage: SendJsonMessage
}

type NodeElementProps = NodeInputProps & {
  id: string
}

interface ElementProps {
  id: string
  sendJsonMessage: SendJsonMessage
  element: NodeInputProps
  key: string
}

interface TextElement {
  nodeId: string
  label: string
  value: string
  icon?: string
}

interface HTMLFileEvent extends Event {
  target: HTMLInputElement & EventTarget
}
