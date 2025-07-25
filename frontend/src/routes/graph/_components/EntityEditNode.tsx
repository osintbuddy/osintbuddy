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
import { useGraphFlowStore } from '@/app/store'

const handleStyle = {
  borderColor: '#1C233B',
  background: '#0c0c32',
  width: 10,
  margin: -4,
  height: 10,
}

interface NodeInput {
  type: NodeTypes
  label: string
  style: React.CSSProperties
  placeholder: string
  options?: DropdownOption[]
  value?: string
  icon?: any
  title?: string
  subtitle?: string
  text?: string
  dispatch: () => void
  sendJsonMessage: () => void
}

type NodeElement = NodeInput & {
  nodeId: string
}

function getNodeElement(
  id: string,
  sendJsonMessage: (message: any) => void,
  element: NodeInput,
  key: string
) {
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

function EditEntityNode({ ctx, sendJsonMessage }: JSONObject) {
  const node = ctx.data

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
                      {getNodeElement(
                        ctx.id,
                        sendJsonMessage,
                        elm,
                        `${elm.label}-${elm.id}-${ctx.id}`
                      )}
                    </Fragment>
                  ))}
                </div>
              )
            }
            return getNodeElement(
              ctx.id,
              sendJsonMessage,
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
// TODO: move me to utils
const createFuzzySearch = function (key, ratio = 0.5) {
  // OLD FUZZY, TODO: abstract me into a search class for multiple search settings...
  // Returns a method that you can use to create your own reusable fuzzy search.
  // return function (query) {
  //   var words = query.toLowerCase().split(' ')

  //   return items.filter(function (item) {
  //     var normalizedTerm = item[key].toLowerCase()

  //     return words.every(function (word) {
  //       return normalizedTerm.indexOf(word) > -1
  //     })
  //   })
  // }
  // ---
  return function (query, item) {
    // Ensure the item has the key and it's a string
    if (!item || typeof item[key] !== 'string') {
      return false // Or handle non-string/missing keys as needed
    }

    const queryLower = query.toLowerCase().trim()
    const itemValueLower = item[key].toLowerCase()

    // Exact match or partial match shortcut
    if (itemValueLower.includes(queryLower)) {
      return true
    }

    // Handle empty query
    if (queryLower === '') {
      return true // Or decide if empty query matches everything/ nothing
    }

    // Fuzzy matching logic based on character occurrences
    let matches = 0
    const queryChars = queryLower.split('')

    for (let i = 0; i < queryChars.length; i++) {
      const char = queryChars[i]
      // Check if the character from the query exists in the item value
      if (itemValueLower.includes(char)) {
        matches += 1
      } else {
        // Optional: Penalize for missing characters
        // matches -= 1;
        // The original logic decremented, but this can lead to negative scores
        // which might not align well with the ratio check.
        // Sticking closer to the original, but consider if penalty is needed.
      }
    }

    // Calculate the match ratio based on query length
    // Handle potential division by zero if query somehow became empty after trim
    const matchRatio = queryLower.length > 0 ? matches / queryLower.length : 0

    // Return true if the calculated ratio meets or exceeds the required ratio
    return matchRatio >= ratio
  }
  // return function (query) {
  //   var string = query.toLowerCase().split(' ')
  //   var compare = term[key].toLowerCase()
  //   var matches = 0
  //   if (string.indexOf(compare) > -1) return true // covers basic partial matches
  //   for (var i = 0; i < compare.length; i++) {
  //     string.indexOf(compare[i]) > -1 ? (matches += 1) : (matches -= 1)
  //   }
  //   return matches / query.length >= ratio || term[key] == ''
  //   //

  //   var words = query.toLowerCase().split(' ')

  //   return items.filter(function (item) {
  //     var normalizedTerm = item[key].toLowerCase()

  //     return words.every(function (word) {
  //       return normalizedTerm.indexOf(word) > -1
  //     })
  //   })
  // }
}

export function DropdownInput({
  options,
  label,
  nodeId,
  sendJsonMessage,
  value,
}: NodeElement) {
  const [query, setQuery] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const isScrollingOrMouseDownOnListRef = useRef(null)
  // TODO: Fix this broken fuzzy search
  const filteredOptions = useMemo(
    () =>
      query === '' || !isOpen
        ? options
        : options.filter((option: DropdownOption) => {
            const fuzzySearch = createFuzzySearch(
              option?.label && option?.label.length !== 0 ? 'label' : 'value',
              0.6
            )
            // option?.label.toLowerCase().includes(query.toLowerCase())
            return fuzzySearch(query)
          }),
    [query, options, isOpen]
  )

  const activeOption = options.find(
    (option) => option.value === value || option.label === value
  ) ?? {
    label: '',
    value: '',
    tooltip: '',
  }

  const { updateNodeData, getNode } = useReactFlow()
  const { elements } = getNode(nodeId)?.data

  const selectOption = useCallback(
    (event, option: DropdownOption) => {
      const optionValue =
        option?.value && option.value.length > 0 ? option.value : option.label
      setIsOpen(false)
      setActiveIndex(-1)
      setQuery('')
      setDisplayValue(option.label)

      const newElements = elements.map((elm) => {
        if (Array.isArray(elm)) {
          return elm.map((e) => {
            if (e.label === label) e.value = optionValue
            return e
          })
        } else {
          if (elm.label === label) elm.value = optionValue
          return elm
        }
      })

      updateNodeData(nodeId, {
        elements: newElements,
      })
      sendJsonMessage({
        action: 'update:entity',
        entity: {
          id: Number(nodeId),
          [label]: optionValue,
        },
      })
    },
    [elements, label, nodeId, updateNodeData, sendJsonMessage]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) {
        if (
          event.key === 'ArrowDown' ||
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          setIsOpen(true)
          setActiveIndex(0)
          event.preventDefault()
        }
        return
      }

      switch (event.key) {
        case 'ArrowDown':
          setActiveIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          event.preventDefault()
          break
        case 'Enter':
          if (activeIndex >= 0 && filteredOptions[activeIndex]) {
            selectOption(event, filteredOptions[activeIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          setActiveIndex(-1)
          inputRef.current?.blur()
          event.preventDefault()
          break
        case 'Tab':
          setActiveIndex((prev) => {
            if (prev === filteredOptions.length - 1) {
              setIsOpen(false)
              return -1
            }
            return prev < filteredOptions.length - 1 ? prev + 1 : 0
          })
          event.preventDefault()
          break
      }
    },
    [isOpen, activeIndex, filteredOptions, selectOption]
  )

  const handleInputChange = useCallback((event: Event) => {
    setQuery(event.currentTarget.value)
    setActiveIndex(-1)
  }, [])

  const handleInputFocus = useCallback(
    (clearQuery = true) => {
      setIsOpen(true)
      if (clearQuery) setQuery('')
      // Find the current active option index when opening
      const currentIndex = options.findIndex(
        (opt) => opt.value === value || opt.label === value
      )
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
    },
    [options, value]
  )

  const handleInputBlur = useCallback((event: FocusEvent) => {
    const relatedTarget = event.relatedTarget as Node | null // Ensure correct typing
    console.log(
      'related inputBlur',
      isScrollingOrMouseDownOnListRef.current || relatedTarget === null
    )
    if (isScrollingOrMouseDownOnListRef.current || relatedTarget === null) {
      // Reset the flag
      isScrollingOrMouseDownOnListRef.current = false

      // Optional: Add a very slight delay and re-focus the input if it's still supposed to be open
      // This handles cases where focus might be fleeting
      // However, often just preventing the close is enough.
      // If needed, you could add:
      setTimeout(() => {
        if (isOpen && inputRef.current) {
          // Don't force focus back, just prevent closing for now
          console.log('timeout', inputRef.current)
          setIsOpen(false)
          // inputRef.current.blur()
        }
      }, 0)

      // Crucially, prevent the dropdown from closing in this scenario
      return
    }
    console.log('blur', comboboxRef.current?.contains(relatedTarget))
    // Original blur logic: Check if focus moved outside the combobox container
    if (!comboboxRef.current?.contains(relatedTarget)) {
      return // Focus moved within the combobox, don't close
    }
    setActiveIndex(-1)
    setQuery('')
  }, [])

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false)
      setActiveIndex(-1)
      setQuery('')
      inputRef.current?.blur()
    } else {
      setIsOpen(true)
      setQuery('')
      const currentIndex = options.findIndex(
        (opt) => opt.value === value || opt.label === value
      )
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
      inputRef.current?.focus()
    }
  }, [isOpen, options, value, setIsOpen])

  useEffect(() => {
    if (activeOption?.label) {
      setDisplayValue(activeOption.label)
    }
  }, [activeOption])
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      // Use requestAnimationFrame or setTimeout to defer scrolling until after render
      // Ensure listRef.current is still valid
      if (
        !listRef.current ||
        !listRef.current.children ||
        listRef.current.children.length === 0
      ) {
        return
      }
      const activeElement = listRef.current.children[activeIndex] as
        | HTMLElement
        | undefined

      if (activeElement) {
        // minimal snappy scrolling to keep active keyboard selection visible
        activeElement.scrollIntoView({
          behavior: 'instant',
          block: 'nearest',
          inline: 'nearest',
        })
      }
    }
  }, [isOpen, activeIndex])

  return (
    <div ref={comboboxRef} className='dropdown-input w-full'>
      <label>
        <p className='whitespace-wrap font-display mt-1 text-[0.5rem] font-semibold text-slate-400'>
          {label}
        </p>
      </label>
      <div className='node-field dropdown relative !px-0'>
        <input
          ref={inputRef}
          role='combobox'
          aria-expanded={isOpen}
          aria-haspopup='listbox'
          aria-autocomplete='list'
          aria-controls={`${nodeId}-${label}-listbox`}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          value={isOpen ? query : displayValue}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className='nodrag mr-4 w-full px-2 outline-hidden'
        />
        <button
          type='button'
          tabIndex={1}
          onClick={handleToggle}
          className='group text-primary absolute inset-y-0 right-0 z-[99] h-5 w-5 focus:outline-hidden'
          aria-label={isOpen ? 'Close options' : 'Open options'}
        >
          <Icon
            icon={isOpen ? 'x' : 'chevron-down'}
            className='h-5 w-5 text-inherit'
          />
        </button>
        {isOpen && (
          <div
            ref={listRef}
            role='listbox'
            id={`${nodeId}-${label}-listbox`}
            className='nodrag nowheel absolute z-[999] mt-1 mr-1 max-h-52 w-full overflow-y-auto rounded-b-md bg-gradient-to-br from-black/30 from-30% to-black/35 py-1 text-[0.6rem] shadow-lg backdrop-blur-lg focus:outline-hidden sm:text-sm'
          >
            {filteredOptions.length === 0 ? (
              <div className='px-2 py-2 text-xs text-slate-500'>
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={`${option.label}-${index}`}
                  role='option'
                  onClick={(event) => selectOption(event, option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`overflow-y-none nowheel nodrag relative flex w-full cursor-pointer flex-col items-start justify-items-start border-l-2 bg-black/15 px-2 py-1 hover:bg-black/30 ${
                    activeOption.label === option.label &&
                    activeOption.value === option.value // if option is currently selected
                      ? 'border-primary bg-black/50 text-slate-500 hover:bg-black/65 hover:text-slate-500'
                      : index === activeIndex // else if current potential option being hovered
                        ? 'border-primary-300 text-slate-350 border-l-2 bg-black/75'
                        : 'border-transparent text-slate-600'
                  }`}
                >
                  <span
                    className='font-display block truncate text-[0.6rem] font-medium'
                    title={
                      option.tooltip !== option.label ? option.tooltip : ''
                    }
                  >
                    {option.label}
                  </span>
                  {option?.value && (
                    <span
                      className={`flex truncate text-[0.5rem] leading-3 ${index === activeIndex && 'text-slate-400'}`}
                    >
                      {option.value}
                    </span>
                  )}
                  {activeOption.label === option.label &&
                    activeOption.value === option.value && (
                      <div class='bg-primary absolute top-2 right-3 h-1.5 w-1.5 rounded-full' />
                    )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(EditEntityNode)
