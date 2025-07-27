import { Icon } from '@/components/icons'
import { DropdownOptionProps, NodeElementProps } from '@/types/graph'
import { useReactFlow } from '@xyflow/react'
import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/compat'

function DropdownInput({
  options = [],
  label,
  nodeId,
  sendJsonMessage,
  value,
}: NodeElementProps) {
  const [query, setQuery] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const isScrollingOrMouseDownOnListRef = useRef<boolean | null>(null)
  // TODO: Fix this broken fuzzy search
  const filteredOptions = useMemo(
    () =>
      query === '' || !isOpen
        ? options
        : options.filter((option: DropdownOptionProps) => {
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
  )

  const { updateNodeData, getNode } = useReactFlow()
  const { elements } = getNode(nodeId)?.data

  const selectOption = useCallback(
    (option: DropdownOptionProps) => {
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
            selectOption(filteredOptions[activeIndex])
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

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event?.currentTarget.value)
      setActiveIndex(-1)
    },
    []
  )

  const handleInputFocus = useCallback(() => {
    setIsOpen(true)
    setQuery('')
    // Find the current active option index when opening
    const currentIndex = options.findIndex(
      (option) => option.value === value || option.label === value
    )
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [options, value])

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
          setIsOpen(false)
          // inputRef.current.blur()
        }
      }, 0)

      // Crucially, prevent the dropdown from closing in this scenario
      return
    }
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
        (option) => option.value === value || option.label === value
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
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`overflow-y-none nowheel nodrag relative flex w-full cursor-pointer flex-col items-start justify-items-start border-l-2 bg-black/15 px-2 py-1 hover:bg-black/30 ${
                    activeOption?.label === option.label &&
                    activeOption?.value === option.value // if option is currently selected
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
                  {activeOption?.label === option.label &&
                    activeOption?.value === option.value && (
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

export default memo(DropdownInput)
