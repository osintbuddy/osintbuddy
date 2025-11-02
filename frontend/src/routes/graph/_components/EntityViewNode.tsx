import { useMemo } from 'preact/hooks'
import { memo } from 'preact/compat'
import { Icon } from '@/components/icons'
import EntityToolbar from './EntityToolbar'
import EntityHandles from './EntityHandles'
import { toSnakeCase } from '../utils'
import { ReactFlowState, useStore } from '@xyflow/react'
import { toast } from 'react-toastify'

// Makes sure we don't see the entity's toolbar when zoomed out too far
const toolbarZoomSelector = (state: ReactFlowState) => {
  return state.transform[2] >= 0.3
}

export function ViewEntityNode({ ctx, blueprint }: JSONObject) {
  if (!blueprint) {
    toast("blueprint not found.", { type: "error" })
    return 
  }

  const { color: backgroundColor, icon, elements } = blueprint

  const value = useMemo(
    () =>
      ctx.data[
        toSnakeCase(
          Array.isArray(elements[0])
            ? elements[0][0]?.label
            : elements[0]?.label
        )
      ] ?? <span class='text-slate-800'>No data found</span>,
    [elements]
  )

  const showContent = useStore(toolbarZoomSelector)
  const {label, ...data} = ctx.data 

  return (
    <>
      <div class='node container !h-18 !w-18 !rounded-full'>
        {showContent && (
          <EntityToolbar
            entityId={ctx.id}
            entityTitle={blueprint.label}
            properties={data}
          />
        )}
        <div style={{ backgroundColor }} class='header !rounded-full !p-2'>
          <Icon
            icon={icon}
            className='!h-16 !w-16 cursor-grab text-slate-300/95 select-none'
          />
        </div>
        {showContent && (
          <h2
            class={`break pointer-events-none absolute top-full -right-28 -left-28 mt-2.5 line-clamp-5 h-auto text-center text-xl leading-6 wrap-anywhere text-slate-400`}
          >
            {value}
          </h2>
        )}
      </div>
      <EntityHandles />
    </>
  )
}

export default memo(ViewEntityNode)
