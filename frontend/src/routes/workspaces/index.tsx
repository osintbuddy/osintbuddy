import { useRef, useState } from 'preact/hooks';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon, CodeBracketIcon, TrashIcon } from '@heroicons/react/24/outline';
import EntityEditor from '@/components/EntityEditor/EntityEditor';
import { Icon } from '@/components/Icons';
import ButtonGhost from '@/components/buttons/ButtonGhost';
import Button from '@/components/buttons/Button';

export default function WorkspacePage() {
  const dropdownRef: any = useRef(200)
  const [query, setQuery] = useState('');
  const [activeEntity, setActiveEntity] = useState<any>({ label: 'Select entity...' });

  // const {
  //   data: entities = [],
  //   isLoading,
  //   isError,
  //   isSuccess,
  //   refetch: refetchEntities,
  // } = useGetEntitiesQuery()
  const entities: any = []
  // @ts-ignore
  const sortedEntities = query === '' || query?.includes('Select') || query === null ? entities.slice().sort((a: any, b: any) => new Date(b.last_edit) - new Date(a.last_edit)) : entities.filter((e: any) => e?.label?.toLowerCase().includes(query.toLowerCase()))

  // const { data: transforms = [], refetch: refetchTransforms } = useGetEntityTransformsQuery({ label: activeEntity?.label }, { skip: activeEntity === null })
  return (
    <>
      <div class="flex flex-col w-full pt-2.5 px-3">
        <section class="flex items-center shadow-md relative rounded-md border-b  backdrop-blur-md from-cod-800/50 to-cod-800/40 bg-gradient-to-br border-mirage-700/20 h-min justify-center pt-0.5 z-[99]">
          {/* <div className='isolate inline-flex shadow-sm'>
                <button title="Toggle the display view" className='justify-center flex-grow rounded-sm from-mirage-400/30 to-mirage-400/40 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-500/30  border-mirage-300/20 relative py-2 inline-flex items-center  border transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-none px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800  focus:z-10' >
                  <CodeBracketIcon className='h-6' />
                </button>
            </div> */}
          <Combobox
            className='w-full '
            as='div'
            value={activeEntity ?? { label: 'Select entity...' }}
            onChange={(option: any) => {
              setActiveEntity(option)
            }}
          >
            <div class=' p-1.5 w-full rounded-sm relative sm:text-sm sm:leading-6  hover:border-mirage-400/60 transition-colors duration-75 ease-in-out justify-between items-center to-mirage-400/40 from-mirage-500/40 bg-gradient-to-br border-2 focus-within:!border-primary/70 focus-within:ring-1 ring-mirage-400/20  text-slate-100 shadow-sm border-mirage-400/20 focus-within:from-mirage-600/60 focus-within:to-mirage-700 focus-within:bg-gradient-to-l dropdown max-w-xs ml-1.5'>
              <ComboboxInput
                ref={dropdownRef}
                onClick={() => {
                  if (activeEntity?.label?.includes("Select entity")) {
                    setActiveEntity('')
                  }
                }}
                onChange={(event) => setQuery(event.currentTarget.value)}
                displayValue={(option: DropdownOption) => option.label}
                className='nodrag font-display focus:ring-info-400 mr-4 outline-none px-2 placeholder:text-slate-600 z-0 text-slate-400 bg-transparent focus:outline-none w-full'
              />
              <ComboboxButton className='absolute z-[99] inset-y-0 h-9 right-0 focus:outline-none'>
                <ChevronUpDownIcon className='h-7 w-7 text-slate-600' aria-hidden='true' />
              </ComboboxButton>
              <ComboboxOptions className='left-px top-11 absolute nodrag nowheel z-10 max-h-80 w-full overflow-y-scroll rounded-b-md from-mirage-800/90 to-mirage-900/80 from-30% border-2 border-mirage-900/80 bg-gradient-to-br text-[0.6rem] shadow-lg backdrop-blur-sm focus:outline-none sm:text-sm'>
                {entities?.length !== 0 ? sortedEntities.map((entity: any) => (
                  <ComboboxOption
                    key={entity.label}
                    value={entity}
                    className={({ active }: any) =>
                      `text-nowrap px-4 flex-col hover:bg-mirage-800 border-l-2 border-transparent hover:border-primary-300 flex py-1.5  nowheel nodrag cursor-default select-none  ${active ? ' text-slate-300/90' : 'text-slate-400'}`
                    }
                  >
                    <span class="block truncate text-md">
                      {entity.label}
                    </span>
                    <span class="flex truncate leading-3 text-[0.6rem]">
                      {entity.author}
                    </span>
                  </ComboboxOption>
                )) : (
                  <div class="text-nowrap px-4 my-2 flex-col hover:bg-mirage-800 flex nowheel nodrag cursor-default select-none text-slate-400 pb-2">
                    <span class="border-b-danger-600/80 border-b-2 font-display text-lg w-min pr-1">
                      No entities found!
                    </span>
                    <span class="w-min my-1">
                        Read the osintbuddy docs to learn how
                        <br /> to setup the default entities.
                    </span>
                  </div>
                )}
              </ComboboxOptions>
            </div>
          </Combobox>
          <div class="flex gap-4 items-center mx-3 py-1.5">
            <ButtonGhost
              variant='danger'
              onClick={() => {
                // updateEntityById({ hid: activeEntity?.id ?? "", entityUpdate: { source: code as string } }).then(() => toast.info(
                //   `The ${activeEntity?.label} entity has been saved.`
                // ))
                // refetchEntity()
              }}
              className="!text-danger-500"
            >
              Delete
              <TrashIcon class="btn-icon" />
            </ButtonGhost>
            <Button
              variant='primary'
              onClick={() => {
                // updateEntityById({ hid: activeEntity?.id ?? "", entityUpdate: { source: code as string } }).then(() => toast.info(
                //   `The ${activeEntity?.label} entity has been saved.`
                // ))
                // refetchEntity()
              }}
              className=""
            >
              Save
              <Icon
                icon="device-floppy"
                className="btn-icon"
              />
            </Button>
          </div>
        </section>
        <EntityEditor
          transforms={[]}
          activeEntity={activeEntity}
          refetchEntity={() => null}
        />
      </div>
    </>
  );
}
