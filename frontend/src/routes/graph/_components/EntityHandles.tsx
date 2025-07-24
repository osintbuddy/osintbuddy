import { Handle, Position } from '@xyflow/react'
import { CSSProperties } from 'preact/compat'

export const handleStyle: CSSProperties = {
  width: 6,
  height: 6,
  padding: 5,
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
