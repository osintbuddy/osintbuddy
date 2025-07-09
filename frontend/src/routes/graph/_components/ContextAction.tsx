import { Icon } from '../../../components/icons'
import { toast } from 'react-toastify'
import { useParams } from 'react-router-dom'
import { Node } from '@xyflow/react'
import { useGraphFlowStore } from '@/app/store'
import { useId } from 'preact/compat'

interface Transform {
  label: string
}

interface ContextActionProps {
  nodeCtx: Node | null
  transforms: Transform[]
  sendJsonMessage: Function
  closeMenu: Function
}

export default function ContextAction({
  nodeCtx: ctx,
  transforms,
  sendJsonMessage,
  closeMenu,
}: ContextActionProps) {
  const { hid } = useParams()
  // const [runTransform, { isLoading }] = useRunEntityTransformMutation()
  const { addNode, addEdge } = useGraphFlowStore()

  const createEntityAction = ({ data, id, position, parentId }: any) => {
    const edgeId = useId()
    addNode({ id, data, position, type: 'edit' })
    addEdge({
      source: parentId,
      target: id,
      sourceHandle: 'r1',
      targetHandle: 'l2',
      type: 'float',
      id: edgeId,
    })
  }

  return (
    <>
      {transforms && ctx && (
        <>
          <div className='node-context max-h-32 overflow-y-scroll'>
            {transforms.map((transform: any) => (
              <div key={transform.label}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    closeMenu()
                    // runTransform({
                    //   hid: hid ?? '',
                    //   sourceEntity: {
                    //     id: ctx?.id,
                    //     type: ctx?.label,
                    //     data: ctx?.data,
                    //     position: ctx?.position,
                    //     transform: transform?.label,
                    //   },
                    // })
                    //   .then((resp: any) => {
                    //     const entities = resp.data.map(
                    //       (node: JSONObject, idx: number) => {
                    //         let entity = { ...node }
                    //         // TODO: Move position layout logic to backend...
                    //         const isOdd = idx % 2 === 0
                    //         const pos = node.position
                    //         const x = isOdd ? pos.x + 560 : pos.x + 970
                    //         const y = isOdd
                    //           ? pos.y - (idx - 4) * 120
                    //           : pos.y - (idx - 3.5) * 120
                    //         entity.position = {
                    //           x,
                    //           y,
                    //         }
                    //         return entity
                    //         // sendJsonMessage({ action: 'update:entity', node: { id: node.id, x, y } });
                    //       }
                    //     )
                    //     entities.forEach((entity: any) => {
                    //       createEntityAction(entity)
                    //       sendJsonMessage({
                    //         action: 'update:entity',
                    //         node: {
                    //           id: entity.id,
                    //           x: entity.position.x,
                    //           y: entity.position.y,
                    //         },
                    //       })
                    //     })
                    //   })
                    //   .catch((err) => console.log(err))
                    // sendJsonMessage({
                    //   action: 'transform:node',
                    //   node: {
                    //     id: ctx.id,
                    //     type: ctx.label,
                    //     data: ctx.data,
                    //     position: ctx.position,
                    //     transform: transform.label,
                    //   },
                    // })
                    toast.warn('TODO: ')
                  }}
                >
                  <Icon icon={transform.icon}></Icon>
                  {transform.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
