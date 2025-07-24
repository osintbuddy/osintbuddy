import { Handle, Position } from '@xyflow/react'
import { CSSProperties } from 'preact/compat'

export const handleStyle: CSSProperties = {
  width: 8,
  height: 8,
  padding: 7,
  zIndex: -10,
}

export default function EntityHandles() {
  return (
    <>
      {[Position.Right, Position.Left, Position.Top, Position.Bottom].map(
        (handle) => {
          return (
            <Handle
              id={handle}
              key={handle}
              type='source'
              position={handle}
              style={handleStyle}
            />
          )
        }
      )}
    </>
  )
}
