import { CSSProperties } from 'preact/compat'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'

export interface DropdownOptionProps {
  label: string
  tooltip: string
  value: string
}

export type NodeTypes =
  | 'dropdown'
  | 'text'
  | 'upload'
  | 'title'
  | 'section'
  | 'textarea'
  | 'copy-text'
  | 'empty'

export interface NodeInputProps {
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
  sendJsonMessage: () => void
}

export type NodeElementProps = NodeInputProps & {
  nodeId: string
}

export interface ElementProps {
  id: string
  sendJsonMessage: SendJsonMessage
  element: NodeInputProps
  key: string
}
