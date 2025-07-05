import { useRef, useState, useEffect } from 'preact/hooks'
import EntityEditor from '@/components/EntityEditor/EntityEditor'
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
      <div class='flex flex-col w-full pt-2.5 px-3'>
        <section class='flex items-center relative rounded-lg  h-min justify-between z-[99]'>
          {/* Custom Combobox */}
          <div class='relative  max-w-xs border-b shadow-2xl shadow-black/15 from-black/10 to-black/40 r backdrop-blur-sm bg-gradient-to-br border-mirage-700/20 '>
            <div class='px-2 w-full relative sm:text-sm sm:leading-6 hover:border-slate-700/20 justify-between items-center bg-gradient-to-br focus-within:!border-primary/70 focus-within:ring-1 ring-mirage-400/20 text-slate-350 font-display shadow-sm focus-within:bg-gradient-to-l dropdown hover:outline-slate-900/30 border-2 border-transparent focus:bg-black/60 from-black/35 to-black/10 hover:from-black/35 hover:to-black/20 bg-linear-to-br transition-all duration-100 ease-in rounded outline-1 outline-slate-900 focus-visible:outline-transparent focus:border-2'>
              <input
                ref={dropdownRef}
                type='text'
                value={query || activeEntity.label}
                onClick={handleInputClick}
                onInput={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                class='focus-visible:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 outline-hidden bg-transparent'
                placeholder='Select entity...'
                autocomplete='off'
                role='combobox'
                aria-expanded={isOpen}
                aria-haspopup='listbox'
              />
              <button
                type='button'
                onClick={toggleDropdown}
                class='absolute z-[99] inset-y-0 h-8 right-0 focus:outline-hidden flex items-center pr-2'
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
                class='left-px top-11 absolute nodrag nowheel z-10 max-h-80 w-full overflow-y-scroll rounded-b-md from-black/35 to-black/10 from-30% border-2 border-mirage-900/80 bg-gradient-to-br text-[0.6rem] shadow-lg backdrop-blur-sm focus:outline-hidden sm:text-sm'
                role='listbox'
              >
                {entities?.length !== 0 ? (
                  sortedEntities.map((entity, index) => (
                    <div
                      key={entity.label || index}
                      onClick={() => handleSelect(entity)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      class={`text-nowrap px-4 flex-col hover:bg-black border-l-2 border-transparent hover:border-primary-400 flex py-1.5 nowheel nodrag cursor-default select-none transition-colors ${
                        focusedIndex === index
                          ? 'bg-black/50 text-slate-350 border-primary-400'
                          : 'text-slate-400'
                      }`}
                      role='option'
                      aria-selected={focusedIndex === index}
                    >
                      <span class='block truncate text-md'>{entity.label}</span>
                      <span class='flex truncate leading-3 text-[0.6rem]'>
                        {entity.author}
                      </span>
                    </div>
                  ))
                ) : (
                  <section class='text-nowrap px-4 my-4 flex-col hover:bg-black/20 flex nowheel nodrag cursor-default select-none text-slate-400 pb-2'>
                    <h5 class='border-b-danger-600/80 border-b-2 font-display text-lg w-min pr-1 leading-5'>
                      No entities found!
                    </h5>
                    <p class='w-min my-1'>
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
