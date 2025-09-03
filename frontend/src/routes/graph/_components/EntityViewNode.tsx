import { useMemo } from 'preact/hooks'
import { memo } from 'preact/compat'
import { Icon } from '@/components/icons'
import EntityToolbar from './EntityToolbar'
import EntityHandles from './EntityHandles'

export function ViewEntityNode({ ctx, blueprint }: JSONObject) {
  const { color: backgroundColor, icon, elements } = blueprint
  const displayValue = useMemo(
    () =>
      Array.isArray(elements[0]) ? elements[0][0]?.value : elements[0]?.value,
    [elements]
  )
  console.log('VUEW BIDE', ctx, blueprint)
  return (
    <>
      <div class='node container !h-18 !w-18 !rounded-full'>
        <EntityToolbar />
        <div style={{ backgroundColor }} class='header !rounded-full !p-2'>
          <Icon
            icon={icon}
            className='!h-16 !w-16 cursor-grab text-slate-300/95 select-none'
          />
        </div>
        <h2
          class={`break pointer-events-none absolute top-full -right-28 -left-28 mt-2.5 line-clamp-4 h-auto text-center text-xl leading-6 wrap-anywhere text-slate-400`}
        >
          {displayValue}
        </h2>
      </div>
      <EntityHandles />
    </>
  )
}

export default memo(ViewEntityNode)
