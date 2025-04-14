import { useMemo, useRef, useState } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import List from 'react-virtualized/dist/es/List'
import { ChevronUpDownIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useGetEntitiesQuery, useGetEntityTransformsQuery } from '@src/app/api';
import EntityEditor from '@src/components/EntityEditor/EntityEditor';
import { Icon } from '@src/components/Icons';


export default function WorkspacePage() {
  const dropdownRef: any = useRef(200)
  const [query, setQuery] = useState('');
  const [activeEntity, setActiveEntity] = useState<any>({ label: 'Select entity...' });

  const {
    data: entities = [],
    isLoading,
    isError,
    isSuccess,
    refetch: refetchEntities,
  } = useGetEntitiesQuery()

  // @ts-ignore
  const sortedEntities = query === '' || query?.includes('Select') || query === null ? entities : entities.slice().sort((a: any, b: any) => new Date(b.last_edit) - new Date(a.last_edit)).filter((e: any) => e?.label?.toLowerCase().includes(query.toLowerCase()))

  const { data: transforms = [], refetch: refetchTransforms } = useGetEntityTransformsQuery({ label: activeEntity?.label }, { skip: activeEntity === null })
  return (
    <>
      <div className="flex flex-col w-full pt-2.5 px-3">
        <section className="flex shadow-md relative rounded-lg border-b  backdrop-blur-md border-mirage-400 from-mirage-500/20 to-mirage-500/50 bg-gradient-to-r h-min rounded-b-sm justify-between z-[99]">
          <div className='flex items-center'>
            <ul className='isolate inline-flex shadow-sm'>
              <div className='flex items-center'>
                <button title="Toggle the display view" className='justify-center flex-grow rounded-sm from-mirage-400/30 to-mirage-400/40 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-500/30  border-mirage-300/20 relative py-2 inline-flex items-center  border transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-none px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800  focus:z-10' >
                  <CodeBracketIcon className='h-6' />
                </button>
              </div>
            </ul>
            <Combobox
              className='w-full dropdown-input '
              as='div'
              value={activeEntity ?? { label: 'Select entity...' }}
              onChange={(option: any) => {
                setActiveEntity(option)
              }}
            >
              <div className='p-2 w-full rounded-sm  relative sm:text-sm sm:leading-6  hover:border-mirage-200/40 transition-colors duration-75 ease-in-out justify-between items-center to-mirage-500/90 from-mirage-600/50 bg-gradient-to-br border focus-within:!border-primary/40  text-slate-100 shadow-sm border-mirage-400/20  focus-within:from-mirage-500/60 focus-within:to-mirage-600 focus-within:bg-gradient-to-l dropdown '>
                <ComboboxInput
                  ref={dropdownRef}
                  onClick={() => {
                    if (activeEntity?.label?.includes("Select entity")) {
                      setActiveEntity('')
                    }
                  }}
                  onChange={(event) => setQuery(event.target.value)}
                  displayValue={(option: DropdownOption) => option.label}
                  className='nodrag font-display focus:ring-info-400 mr-4 outline-none px-2 placeholder:text-slate-600 z-0 text-slate-400 bg-transparent focus:outline-none w-full'
                />
                <ComboboxButton className='absolute z-[99] mt-0.5  inset-y-0 h-9 right-0 focus:outline-none'>
                  <ChevronUpDownIcon className='h-7 w-7 !text-slate-600 ' aria-hidden='true' />
                </ComboboxButton>
                <ComboboxOptions className='p-2 left-px top-11 absolute nodrag nowheel z-10 max-h-80 w-full overflow-hidden rounded-b-md from-mirage-700/90 to-mirage-800/80 from-30%  bg-gradient-to-br py-1 text-[0.6rem] shadow-lg backdrop-blur-sm focus:outline-none sm:text-sm'>
                  {sortedEntities.map((entity: any) => (
                    <ComboboxOption
                      key={entity.label}
                      value={entity}
                      className={({ active }: any) =>
                        `text-nowrap px-2  flex-col hover:bg-mirage-700 flex py-1.5  nowheel nodrag cursor-default select-none  ${active ? ' text-slate-400' : 'text-slate-400/80'}`
                      }
                    >
                      <span className="block truncate text-md">
                        {entity.label}
                      </span>
                      <span className="flex truncate leading-3 text-[0.6rem]">
                        {entity.author}
                      </span>
                    </ComboboxOption>
                  ))}
                </ComboboxOptions>
              </div>
            </Combobox>
          </div>
        </section>
        <EntityEditor
          transforms={transforms}
          activeEntity={activeEntity}
          refetchEntity={() => refetchEntities} 
        />
      </div>
    </>
  );
}
