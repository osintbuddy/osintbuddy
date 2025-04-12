import classNames from 'classnames';
import { useRef, useState } from 'react';
import { Combobox } from '@headlessui/react';
import { HandRaisedIcon } from '@heroicons/react/20/solid';
import List from 'react-virtualized/dist/es/List'
import {
  ChevronUpDownIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { useGetEntitiesQuery } from '@src/app/api';
import EntityEditor from '@src/components/EntityEditor/EntityEditor';


export default function WorkspacePage() {
  const rowRenderer = ({ index, key, isScrolling, isVisible, style }: any) => {
    return (
      <Combobox.Option
        key={key}
        style={style}
        value={entitiesData.entities[index]}
        className={({ active }) =>
          `overflow-y-none px-2 flex  flex-col justify-center nowheel nodrag cursor-default select-none  ${active ? 'bg-mirage-800 text-slate-400' : 'text-slate-400/80'}`
        }
      >
        <span
          className="block truncate text-md"
        >
          {entitiesData.entities[index].label}
        </span>

        <span
          className="flex truncate leading-3 text-[0.6rem]"
        >
          {entitiesData.entities[index].author}
        </span>
      </Combobox.Option>

    )
  }
  const dropdownRef: any = useRef(200)
  const [query, setQuery] = useState('');
  const [activeOption, setActiveOption] = useState<any>({ label: 'Select entity...' });

  const {
    data: entitiesData = { entities: [], count: 0, favorite_entities: [], favorite_count: 0 },
    isLoading,
    isError,
    isSuccess,
    refetch: refetchEntities,
  } = useGetEntitiesQuery()


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
              value={activeOption ?? { label: 'Select entity...' }}
              onChange={(option: any) => setActiveOption(option)}
            >
              <div className='p-2 w-full rounded-sm  relative sm:text-sm sm:leading-6  hover:border-mirage-200/40 transition-colors duration-75 ease-in-out justify-between items-center to-mirage-500/90 from-mirage-600/50 bg-gradient-to-br border focus-within:!border-primary/40  text-slate-100 shadow-sm border-mirage-400/20  focus-within:from-mirage-500/60 focus-within:to-mirage-600 focus-within:bg-gradient-to-l dropdown '>
                <Combobox.Input
                  ref={dropdownRef}
                  onClick={() => {
                    if (activeOption.label.includes("Select entity")) {
                      setActiveOption('')
                    }
                  }}
                  onChange={(event) => setQuery(event.target.value)}
                  displayValue={(option: DropdownOption) => option.label}
                  className='nodrag font-display focus:ring-info-400 mr-4 outline-none px-2 placeholder:text-slate-600 z-0 text-slate-400 bg-transparent focus:outline-none w-full'
                />
                <Combobox.Button className='absolute z-[99] mt-0.5  inset-y-0 h-9 right-0 focus:outline-none'>
                  <ChevronUpDownIcon className='h-7 w-7 !text-slate-600 ' aria-hidden='true' />
                </Combobox.Button>
                <Combobox.Options className='p-2 left-px top-11 absolute nodrag nowheel z-10 max-h-80 w-full overflow-hidden rounded-b-md from-mirage-700/90 to-mirage-800/80 from-30%  bg-gradient-to-br py-1 text-[0.6rem] shadow-lg backdrop-blur-sm focus:outline-none sm:text-sm'>
                  <List
                    height={200}
                    rowHeight={40}
                    width={230}

                    rowCount={entitiesData.entities.length}
                    rowRenderer={rowRenderer}
                  />
                </Combobox.Options>
              </div>
            </Combobox>
          </div>
          {/* <ul className='isolate inline-flex shadow-sm '>
            <button
              onClick={() => {
              }}
              type='button'
              className={classNames(
                'justify-center flex-grow rounded-sm border  from-mirage-300/10 to-mirage-300/20 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-300/30  border-mirage-300/60 relative 2 inline-flex items-center transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-none px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 focus:z-10',
                true && 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50 '
              )}
            >
              <HandRaisedIcon
                className={classNames('h-6 w-6 ', true && 'text-primary-300')}
                aria-hidden='true'
              />
            </button>

          </ul> */}
        </section>
        <EntityEditor activeEntity={activeOption} refetchEntity={() => null} />
      </div>
    </>
  );
}
