import { useRef, useState, useEffect } from 'preact/hooks'
import EntityEditor from '@/components/editor/EntityEditor'
import { Icon } from '@/components/icons'
import Button from '@/components/buttons'
import { NavLink } from 'react-router-dom'

interface DropdownOption {
  label: string
  author?: string
  id?: string
  last_edit?: string
}

export default function WorkspacePage() {
  const dropdownRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [activeEntity, setActiveEntity] = useState<DropdownOption>({
    label: 'Select entity...',
  })
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Mock data - replace with your actual data fetching
  const entities: DropdownOption[] = []

  const sortedEntities =
    query === '' || query?.includes('Select') || query === null
      ? entities
          .slice()
          .sort(
            (a: any, b: any) => new Date(b.last_edit) - new Date(a.last_edit)
          )
      : entities.filter((e: any) =>
          e?.label?.toLowerCase().includes(query.toLowerCase())
        )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        optionsRef.current &&
        !optionsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        setIsOpen(true)
        setFocusedIndex(0)
        event.preventDefault()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((prev) =>
          prev < sortedEntities.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        event.preventDefault()
        if (focusedIndex >= 0 && sortedEntities[focusedIndex]) {
          handleSelect(sortedEntities[focusedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setFocusedIndex(-1)
        dropdownRef.current?.blur()
        break
    }
  }

  const handleSelect = (entity: DropdownOption) => {
    setActiveEntity(entity)
    setQuery(entity.label)
    setIsOpen(false)
    // setFocusedIndex(-1);
  }

  const handleInputChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    setQuery(target.value)
    setIsOpen(true)
    setFocusedIndex(-1)
  }

  const handleInputClick = () => {
    if (activeEntity?.label?.includes('Select entity')) {
      setActiveEntity({ label: '' })
      setQuery('')
    }
    setIsOpen(true)
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      dropdownRef.current?.focus()
    }
  }

  console.log(focusedIndex)

  return (
    <>
      <div class='flex w-full flex-col px-3 pt-2.5'>
        <section class='relative z-[99] flex h-min items-center justify-between rounded-lg'>
          {/* Custom Combobox */}
          <div class='r border-mirage-700/20 relative max-w-xs border-b bg-gradient-to-br from-black/10 to-black/40 shadow-2xl shadow-black/15 backdrop-blur-sm'>
            <div class='focus-within:!border-primary/70 ring-mirage-400/20 text-slate-350 font-display dropdown relative w-full items-center justify-between rounded border-2 border-transparent bg-linear-to-br bg-gradient-to-br from-black/35 to-black/10 px-2 shadow-sm outline-1 outline-slate-900 transition-all duration-100 ease-in focus-within:bg-gradient-to-l focus-within:ring-1 hover:border-slate-700/20 hover:from-black/35 hover:to-black/20 hover:outline-slate-900/30 focus:border-2 focus:bg-black/60 focus-visible:outline-transparent sm:text-sm sm:leading-6'>
              <input
                ref={dropdownRef}
                type='text'
                value={query || activeEntity.label}
                onClick={handleInputClick}
                onInput={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                class='focus-visible:border-primary text-slate-350 w-64 bg-transparent py-1 outline-hidden placeholder:text-slate-800'
                placeholder='Select entity...'
                autocomplete='off'
                role='combobox'
                aria-expanded={isOpen}
                aria-haspopup='listbox'
              />
              <button
                type='button'
                onClick={toggleDropdown}
                class='absolute inset-y-0 right-0 z-[99] flex h-8 items-center pr-2 focus:outline-hidden'
                aria-label='Toggle dropdown'
              >
                <Icon
                  icon='chevron-down'
                  className='h-7 w-7 text-slate-600'
                  aria-hidden='true'
                />
              </button>
            </div>

            {/* Dropdown Options */}
            {isOpen && (
              <div
                ref={optionsRef}
                class='nodrag nowheel border-mirage-900/80 absolute top-11 left-px z-10 max-h-80 w-full overflow-y-scroll rounded-b-md border-2 bg-gradient-to-br from-black/35 from-30% to-black/10 text-[0.6rem] shadow-lg backdrop-blur-sm focus:outline-hidden sm:text-sm'
                role='listbox'
              >
                {entities?.length !== 0 ? (
                  sortedEntities.map((entity, index) => (
                    <div
                      key={entity.label || index}
                      onClick={() => handleSelect(entity)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      class={`hover:border-primary-400 nowheel nodrag flex cursor-default flex-col border-l-2 border-transparent px-4 py-1.5 text-nowrap transition-colors select-none hover:bg-black ${
                        focusedIndex === index
                          ? 'text-slate-350 border-primary-400 bg-black/50'
                          : 'text-slate-400'
                      }`}
                      role='option'
                      aria-selected={focusedIndex === index}
                    >
                      <span class='text-md block truncate'>{entity.label}</span>
                      <span class='flex truncate text-[0.6rem] leading-3'>
                        {entity.author}
                      </span>
                    </div>
                  ))
                ) : (
                  <section class='nowheel nodrag my-4 flex cursor-default flex-col px-4 pb-2 text-nowrap text-slate-400 select-none hover:bg-black/20'>
                    <h5 class='border-b-danger-600/80 font-display w-min border-b-2 pr-1 text-lg leading-5'>
                      No entities found!
                    </h5>
                    <p class='my-1 w-min'>
                      Read{' '}
                      <NavLink to='/docs/overview' class='text-primary-200'>
                        the OSIB book
                      </NavLink>{' '}
                      to learn how
                      <br /> to setup the default entities.
                    </p>
                  </section>
                )}
              </div>
            )}
          </div>

          {focusedIndex !== -1 && (
            <div class='flex gap-4'>
              <Button.Ghost
                variant='danger'
                onClick={() => {
                  // updateEntityById({ hid: activeEntity?.id ?? "", entityUpdate: { source: code as string } }).then(() => toast.info(
                  //   `The ${activeEntity?.label} entity has been saved.`
                  // ))
                  // refetchEntity()
                }}
                className='!text-danger-500'
              >
                Delete
                <Icon icon='trash' className='btn-icon' />
              </Button.Ghost>
              <Button.Solid
                variant='primary'
                onClick={() => {
                  // updateEntityById({ hid: activeEntity?.id ?? "", entityUpdate: { source: code as string } }).then(() => toast.info(
                  //   `The ${activeEntity?.label} entity has been saved.`
                  // ))
                  // refetchEntity()
                }}
                className=''
              >
                Save
                <Icon icon='device-floppy' className='btn-icon' />
              </Button.Solid>
            </div>
          )}
        </section>

        {focusedIndex !== -1 && (
          <EntityEditor
            transforms={[]}
            activeEntity={activeEntity}
            refetchEntity={() => null}
          />
        )}
      </div>
    </>
  )
}
