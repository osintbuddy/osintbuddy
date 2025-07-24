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
import { Handle, Position } from '@xyflow/react'
import { FixedSizeList as List } from 'react-window'
import EntityToolbar from './EntityToolbar'
import EntityHandles from './EntityHandles'
// Use useRef instead of global variables to avoid memory leaks
let dropdownKeyRef = { current: 0 }
let nodeKeyRef = { current: 0 }

const getDropdownKey = () => {
  dropdownKeyRef.current += 1
  return `k_${dropdownKeyRef.current}`
}

const getNodeKey = () => {
  nodeKeyRef.current += 1
  return `k_${nodeKeyRef.current}`
}

const handleStyle = {
  borderColor: '#1C233B',
  background: '#0c0c32',
  width: 10,
  margin: -4,
  height: 10,
}

type NodeElement = NodeInput & {
  nodeId: string
  editState: EditState
}

function EditEntityNode({ ctx, sendJsonMessage }: JSONObject) {
  const node = ctx.data

  const getNodeElement = useCallback(
    (element: NodeInput, key: string | null = getNodeKey()) => {
      switch (element.type) {
        case 'dropdown':
          return (
            <DropdownInput
              key={key}
              nodeId={ctx.id}
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
              nodeId={ctx.id}
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
              nodeId={ctx.id}
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
              nodeId={ctx.id}
              label={element?.label}
              value={element?.value || ''}
            />
          )

        case 'section':
          return (
            <Text
              key={key}
              nodeId={ctx.id}
              label={element?.label}
              value={element?.value || ''}
            />
          )
        case 'textarea':
          return (
            <TextArea
              key={key}
              nodeId={ctx.id}
              label={element?.label}
              value={element?.value || ''}
              sendJsonMessage={sendJsonMessage}
            />
          )
        case 'copy-text':
          return (
            <CopyText
              key={key}
              nodeId={ctx.id}
              label={element?.label}
              value={element?.value || ''}
            />
          )
        case 'empty':
          return <input className='pointer-events-none h-0 bg-transparent' />
      }
    },
    [ctx.id, sendJsonMessage]
  )

  const columnsCount = useMemo(
    () =>
      Math.max(
        0,
        ...node.elements.map((s) => (s.length === undefined ? 1 : s.length))
      ),
    [node.elements]
  )
  return (
    <>
      <EntityHandles />
      <EntityToolbar />
      <div className='node container'>
        <div
          // 99 === 0.6 opacity
          style={{
            backgroundColor:
              node?.color?.length === 7 ? `${node.color}99` : node?.color,
          }}
          className='text-slate-350 flex h-full w-full cursor-grab items-center justify-between rounded-t-md px-1 py-2 active:cursor-grabbing'
        >
          <GripIcon class='h-6 w-6' />
          <div className='flex w-full flex-col px-2 font-medium'>
            <p className='whitespace-wrap font-display text-slate-350 flex text-[0.4rem] font-black'>
              <span className='whitespace-wrap -top-1 mr-0.5 max-w-xl text-[0.4rem] font-extralight text-inherit'>
                ID:
              </span>
              {ctx.id}
            </p>
            <p className='whitespace-wrap font-display max-w-xl text-[0.65rem] font-semibold text-slate-200'>
              {ctx.data.label}
            </p>
          </div>
          <Icon
            icon={ctx.data.icon}
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
          {ctx.data.elements.map((element: NodeInput, i: number) => {
            if (Array.isArray(element)) {
              return (
                <div
                  style={{
                    display: 'grid',
                    columnGap: '0.5rem',
                    gridTemplateColumns: `repeat(${element.length}, minmax(0, 1fr))`,
                  }}
                  key={i.toString()}
                >
                  {element.map((elm, i: number) => (
                    <Fragment key={i.toString()}>
                      {getNodeElement(elm, `${elm.label}-${elm.id}-${ctx.id}`)}
                    </Fragment>
                  ))}
                </div>
              )
            }
            return getNodeElement(
              element,
              `${element.label}-${element.id}-${ctx.id}`
            )
          })}
        </form>
      </div>
    </>
  )
}

export function CopyText({
  nodeId,
  label,
  value,
}: {
  nodeId: string
  label: string
  value: string
}) {
  return (
    <div
      onClick={() => {
        navigator.clipboard.writeText(value)
        toast.success(`Copied ${label} to clipboard!`)
      }}
      className='text-info-300 flex max-w-xs items-center'
    >
      <Icon icon='paperclip' className='h-4 w-4' />
      <p
        title='Click to copy'
        data-type='link'
        className='ml-2 truncate text-xs break-keep whitespace-nowrap text-inherit'
      >
        {value}
      </p>
      <input
        type='text'
        className='hidden'
        data-label={label}
        id={`${nodeId}-${label}`}
        value={value}
        readOnly
      />
    </div>
  )
}

export function TextArea({
  nodeId,
  label,
  sendJsonMessage,
  icon,
  value: initValue,
}: NodeElement) {
  const [value, setValue] = useState(initValue)
  const [showMonospace, setShowMonospace] = useState(true)

  return (
    <div className='flex w-full flex-col'>
      <label
        onClick={() => setShowMonospace(!showMonospace)}
        className='font-display flex items-center justify-between text-[0.55rem] leading-4 font-medium text-slate-400'
      >
        {label}
        <Icon
          icon={showMonospace ? 'brackets-angle' : 'brackets-angle-off'}
          className='h-4 w-4 text-slate-500'
        />
      </label>
      <div className='hover:border-mirage-200/50 focus-within:!border-primary-350 border-mirage-200/30 w-full rounded-sm border focus-within:from-black/25 focus-within:to-black/20'>
        <textarea
          rows={4}
          spellcheck={false}
          className={`nodrag nowheel whitespace-wrap order block w-full rounded-sm bg-transparent bg-gradient-to-br from-black/10 to-black/15 px-1 py-px text-xs text-slate-400 shadow-sm outline-hidden transition-colors duration-75 ease-in-out placeholder:text-slate-700 focus-within:bg-gradient-to-l focus:outline-hidden sm:text-xs ${showMonospace && '!font-code'}`}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          onBlur={() => {
            sendJsonMessage({
              action: 'update:entity',
              entity: { id: Number(nodeId), [label]: value },
            })
          }}
        />
      </div>
    </div>
  )
}

const MAX_TEXT_LENGTH = 100

export function Text({
  nodeId,
  label,
  value,
  icon,
}: {
  nodeId: string
  label: string
  value: string
  icon?: any
}) {
  return (
    <div className='relative flex w-full pb-1 text-slate-400'>
      {icon && <Icon icon={icon} className='h-6 w-6' />}
      <p className='pr-2.5 text-xs text-slate-400 transition-colors duration-500 ease-out'>
        {value}{' '}
      </p>
    </div>
  )
}

export function Title({
  nodeId,
  label,
  value,
}: {
  nodeId: string
  label: string
  value: string
}) {
  return (
    <div className='node-display !my-0 !py-0'>
      {value && <h1 className='my-0'>{value}</h1>}
    </div>
  )
}

export function UploadFileInput({
  nodeId,
  initialValue,
  label,
  sendJsonMessage,
  icon,
}: {
  nodeId: string
  label: string
  initialValue: string
  sendJsonMessage: Function
  icon?: any
}) {
  const [value, setValue] = useState<File>(initialValue as any)

  const updateValue = (event: ChangeEvent<HTMLInputElement>) => {
    if (event?.target?.files && event?.target?.files?.length > 0) {
      const file = event.target.files[0]
      setValue(file)
      sendJsonMessage({
        action: 'update:entity',
        entity: {
          id: Number(nodeId),
          [label]: file,
          name: file?.name || 'unknown',
        },
      })
    }
  }

  return (
    <>
      <p className='whitespace-wrap font-display mt-1 ml-1 text-[0.5rem] font-semibold text-slate-400'>
        {label}
      </p>
      <div className='flex items-center'>
        <div className='node-field'>
          <Icon icon={icon} className='h-6 w-6' />
          <label
            className={classNames('ml-5 w-52', value?.name && 'text-slate-400')}
          >
            <input
              data-label={label}
              id={`${nodeId}-${label}`}
              type='file'
              className='nodrag'
              onChange={(event: any) => updateValue(event)}
            />
            {value?.name ? value.name : label}
          </label>
        </div>
      </div>
    </>
  )
}

export function TextInput({
  nodeId,
  label,
  sendJsonMessage,
  icon,
  value: initValue,
}: NodeElement) {
  const [value, setValue] = useState(initValue)

  return (
    <>
      <div className='flex flex-col'>
        <label className='whitespace-wrap font-display nodrag mt-0.5 ml-0.5 text-[0.55rem] font-medium text-slate-400 active:cursor-grabbing'>
          {label}
        </label>
        <div className='node-field nodrag'>
          <input
            id={`${nodeId}-${label}`}
            type='text'
            onBlur={(event) => {
              sendJsonMessage({
                action: 'update:entity',
                entity: { id: Number(nodeId), [label]: value },
              })
            }}
            onChange={(event: InputEvent) =>
              setValue(event.currentTarget.value)
            }
            value={value ?? initValue}
          />
          <Icon icon={icon} />
        </div>
      </div>
    </>
  )
}

interface DropdownOption {
  label: string
  tooltip: string
  value: string
}

export function DropdownInput({
  options,
  label,
  nodeId,
  sendJsonMessage,
  value: activeValue,
}: NodeElement) {
  const [query, setQuery] = useState('')
  const dropdownRef = useRef(200)
  const filteredOptions = useMemo(
    () =>
      query === ''
        ? ([...options].sort((a, b) => a.label.localeCompare(b.label)) ?? [])
        : ([...options]
            ?.sort((a, b) => a.label.localeCompare(b.label))
            .filter((option: DropdownOption) =>
              option?.label.toLowerCase().includes(query.toLowerCase())
            ) ?? []),
    [query]
  )
  const activeOption = options.find(
    (option) => option.value === activeValue || option.label === activeValue
  ) ?? {
    label: '',
    value: '',
    tooltip: '',
  }

  const DropdownCell = useCallback(
    ({ index, key, isScrolling, isVisible, style }) => {
      return (
        <div
          key={key}
          style={style}
          className={`overflow-y-none nowheel nodrag flex cursor-default flex-col justify-center px-2 select-none ${activeOption.label === filteredOptions[index].label || activeOption.value === filteredOptions[index].value ? 'bg-black/65 text-slate-400' : 'text-slate-500'}`}
        >
          <span
            className='block truncate text-xs'
            title={
              options[index].tooltip !== filteredOptions[index].label
                ? filteredOptions[index].tooltip
                : 'No description found'
            }
          >
            {filteredOptions[index].label}
          </span>
          {filteredOptions[index]?.value && (
            <span
              className='flex truncate text-[0.5rem] leading-3'
              title={
                filteredOptions[index].tooltip !== filteredOptions[index].label
                  ? filteredOptions[index].tooltip
                  : 'No description found'
              }
            >
              {filteredOptions[index].value}
            </span>
          )}
          {/* </Combobox.Option > */}
        </div>
      )
    },
    []
  )

  useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false)
      }
    }
    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownRef])
  const [showOptions, setShowOptions] = useState(false)
  return (
    <>
      <div
        className='dropdown-input w-full'
        as='div'
        value={activeOption}
        onChange={(option) => {
          sendJsonMessage({
            action: 'update:entity',
            entity: {
              id: Number(nodeId),
              [label]: option?.value ? option.value : option.label,
            },
          })
        }}
      >
        <label>
          <p className='whitespace-wrap font-display mt-1 text-[0.5rem] font-semibold text-slate-400'>
            {label}
          </p>
        </label>
        <div ref={dropdownRef} className='node-field dropdown relative !px-0'>
          <input
            onChange={(event) => setQuery(event.target.value)}
            displayValue={(option: DropdownOption) => option.label}
            className='nodrag focus:ring-info-400 mr-4 w-full px-2 outline-hidden'
          />
          <button
            onClick={() => setShowOptions(!showOptions)}
            className='group absolute inset-y-0 right-0 z-[99] h-8 w-5 focus:outline-hidden'
          >
            <Icon
              icon={showOptions ? 'x' : 'chevron-down'}
              className={`${showOptions && '!text-slate-500'} h-5 w-5 text-slate-600 group-hover:!text-slate-400`}
              aria-hidden='true'
            />
          </button>
          {showOptions && (
            <div className='nodrag nowheel absolute z-[999] mr-1 max-h-80 w-full overflow-hidden rounded-b-md bg-gradient-to-br from-black/65 from-30% to-black/55 py-1 text-[0.6rem] shadow-lg backdrop-blur-lg focus:outline-hidden sm:text-sm'>
              <List
                itemSize={34}
                itemCount={filteredOptions?.length ?? 0}
                rowCount={filteredOptions?.length ?? 0}
                width={dropdownRef?.current?.clientWidth}
                height={
                  filteredOptions?.length <= 3
                    ? filteredOptions?.length * 54
                    : 260
                }
                rowHeight={({ index }) =>
                  filteredOptions[index]?.value ? 54 : 40
                }
              >
                {DropdownCell}
              </List>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default memo(EditEntityNode)
