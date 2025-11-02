// @ts-nocheck
import {
  ChangeEvent,
  Dispatch,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'preact/hooks'
import { Fragment, memo } from 'preact/compat'
import { GripIcon, Icon } from '@/components/icons'
import { toast } from 'react-toastify'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import { FixedSizeList as List } from 'react-window'
import EntityToolbar from './EntityToolbar'
import EntityHandles from './EntityHandles'
import Element from './Element'
import { useEntitiesStore, useFlowStore } from '@/app/store'
import { toSnakeCase } from '../utils'
const handleStyle = {
  borderColor: '#1C233B',
  background: '#0c0c32',
  width: 10,
  margin: -4,
  height: 10,
}

export function EditEntityNode({
  ctx,
  sendJsonMessage,
  blueprint,
}: JSONObject) {
  if (!blueprint) {
    toast("blueprint not found.", { type: "error" })
    return
  }

  const columnsCount = useMemo(() => {
    return Math.max(
      0,
      ...blueprint.elements.map((e) => {
        return e?.length === undefined ? 1 : e.length
      })
    )
  }, [blueprint])

  const {label, ...data} = ctx.data 

  return (
    <>
      <EntityHandles />
      <EntityToolbar entityId={ctx.id} entityTitle={blueprint.label} properties={data} />
      <div className='node container'>
        <div
          // 99 === 0.6 opacity
          style={{
            backgroundColor:
              blueprint?.color?.length === 7
                ? `${blueprint.color}99`
                : blueprint?.color,
          }}
          className='text-slate-350 flex h-full w-full cursor-grab items-center justify-between rounded-t-md px-1 py-2 active:cursor-grabbing'
        >
          <Icon icon='grip-vertical' class='h-7 w-7' />
          <div className='flex w-full flex-col px-2 font-medium'>
            <p className='whitespace-wrap font-display text-slate-350 flex text-[0.4rem] font-black'>
              <span className='whitespace-wrap -top-1 mr-0.5 max-w-xl text-[0.4rem] font-light text-inherit'>
                ID:
              </span>
              {ctx.id.substring(0, 8).toUpperCase()}
            </p>
            <p className='whitespace-wrap font-display max-w-xl text-[0.65rem] font-semibold text-slate-200'>
              {blueprint.label}
            </p>
          </div>
          <Icon
            icon={blueprint.icon}
            className='mx-1 h-6 w-6 cursor-grab focus:cursor-grabbing'
          />
        </div>
        <form
          id={`${ctx.id}-form`}
          onSubmit={(event) => event.preventDefault()}
          className='elements'
          style={{
            gridTemplateColumns: '100%',
          }}
        >
          {blueprint.elements.map((element: NodeInput, i: number) => {
            if (Array.isArray(element)) {
              return (
                <div
                  style={{
                    display: 'grid',
                    columnGap: '0.5rem',
                    gridTemplateColumns: `repeat(${element.length}, minmax(0, 1fr))`,
                  }}
                  key={i}
                >
                  {element.map((elm, i: number) => {
                    const value = ctx.data[toSnakeCase(elm.label)]
                    if (value) {
                      elm.value = value
                    }
                    return (
                      <Fragment key={i}>
                        <Element
                          data={ctx.data}
                          id={ctx.id}
                          sendJsonMessage={sendJsonMessage}
                          element={elm}
                          key={`${elm.label}-${elm.id}-${blueprint.id}`}
                        />
                      </Fragment>
                    )
                  })}
                </div>
              )
            }
            const value = ctx.data[toSnakeCase(element.label)]
            if (value) {
              element.value = value
            }
            return (
              <Element
                data={ctx.data}
                id={ctx.id}
                sendJsonMessage={sendJsonMessage}
                element={element}
                key={`${element.label}-${element.id}-${blueprint.id}`}
              />
            )
          })}
        </form>
      </div>
    </>
  )
}

export default memo(EditEntityNode)
