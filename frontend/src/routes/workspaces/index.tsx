import { InquiryHeader } from '@src/components/Headers';
import classNames from 'classnames';
import { Fragment, Ref, useEffect, useRef, useState } from 'react';
import { Combobox } from '@headlessui/react';
import { HandRaisedIcon, HomeIcon, MagnifyingGlassIcon, ViewfinderCircleIcon } from '@heroicons/react/20/solid';
import List from 'react-virtualized/dist/es/List'
import {
  ExclamationCircleIcon,
  PencilSquareIcon,
  ListBulletIcon,
  Squares2X2Icon,
  MapIcon,
  InboxIcon,
  ChevronUpDownIcon,
  XMarkIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { UnderConstruction } from '@src/components/Loaders';
import { useGetEntitiesQuery, useGetEntityQuery } from '@src/app/api';
import EntityEditor from '@src/components/EntityEditor/EntityEditor';

const items = [
  {
    id: 1,
    name: 'Text',
    description: 'Add freeform text with basic formatting options.',
    url: '#',
    color: 'bg-indigo-500',
    icon: PencilSquareIcon,
  },
  // More items...
];

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

          <ul className='isolate inline-flex shadow-sm '>
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

          </ul>
        </section>
        <EntityEditor activeEntity={{ source: `import socket
import httpx
from selenium.webdriver.common.by import By
from osintbuddy.elements import TextInput
from osintbuddy.errors import OBPluginError
from osintbuddy.utils import to_camel_case
import httpx
import osintbuddy as ob


class IP(ob.Plugin):
    label = "IP"
    color = "#F47C00"
    entity = [TextInput(label="IP Address", icon="map-pin")]
    icon = "building-broadcast-tower"
    author = "OSIB"
    description = "Internet Protocol address"

    @ob.transform(label="To website", icon="world")
    async def transform_to_website(self, node, use):
        website_entity = await ob.Registry.get_plugin('website')
        try:
            resolved = socket.gethostbyaddr(node.ip_address)
            if len(resolved) >= 1:
                blueprint = website_entity.create(domain=resolved[0])
                return blueprint
            else:
                raise OBPluginError("No results found")
        except (socket.gaierror, socket.herror):
            raise OBPluginError("We ran into a socket error. Please try again")

    @ob.transform(label="To subdomains", icon="world")
    async def transform_to_subdomains(self, node, use):
        nodes = []
        params = {
            "q": node.ip_address,
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    'https://api.hackertarget.com/reverseiplookup',
                    params=params,
                    timeout=None
                )
                data = response.content.decode("utf8").split("\\n")
        except Exception as e:
            raise OBPluginError(e)
        subdomain_entity = await ob.Registry.get_plugin('subdomain')
        for subdomain in data:
            blueprint = subdomain_entity.create(subdomain=subdomain)
            nodes.append(blueprint)
        return nodes

    @ob.transform(label="To geolocation", icon="map-pin")
    async def transform_to_geolocation(self, node, use):
        summary_rows = [
            "ASN",
            "Hostname",
            "Range",
            "Company",
            "Hosted domains",
            "Privacy",
            "Anycast",
            "ASN type",
            "Abuse contact",
        ]
        geo_rows = [
            "City",
            "State",
            "Country",
            "Postal",
            "Timezone",
            "Coordinates",
        ]
        if len(node.ip_address) == 0:
            raise OBPluginError(
                "A valid IP Address is a required field for this transform"
            )

        geolocation = {}
        summary = {}
        with use.get_driver() as driver:
            driver.get(f'https://ipinfo.io/{node.ip_address}')
            for row in summary_rows:
                summary[to_camel_case(row)] = driver.find_element(
                    by=By.XPATH, value=self.get_summary_xpath(row)
                ).text
            for row in geo_rows:
                geolocation[to_camel_case(row)] = driver.find_element(
                    by=By.XPATH, value=self.get_geo_xpath(row)
                ).text
        IPGeolocationPlugin = await ob.Registry.get_plugin('ip_geolocation')
        blueprint = IPGeolocationPlugin.create(
            city=geolocation.get("city"),
            state=geolocation.get("state"),
            country=geolocation.get("country"),
            postal=geolocation.get("postal"),
            timezone=geolocation.get("timezone"),
            coordinates=geolocation.get("coordinates"),
            asn=summary.get("asn"),
            hostname=summary.get("hostname"),
            range=summary.get("range"),
            company=summary.get("company"),
            hosted_domains=summary.get("hostedDomains"),
            privacy=summary.get("privacy"),
            anycast=summary.get("anycast"),
            asn_type=summary.get("asnType"),
            abuse_contact=summary.get("abuseContact"),
        )
        return blueprint

    @staticmethod
    def get_summary_xpath(value: str):
        return (
            f"//td//span[contains(text(),'{value}')]"
            "/ancestor::td/following-sibling::td"
        )

    @staticmethod
    def get_geo_xpath(value: str):
        return f"//td[contains(text(),'{value}')]/following-sibling::td"
`}} refetchEntity={() => null} />
      </div>
    </>
  );
}
