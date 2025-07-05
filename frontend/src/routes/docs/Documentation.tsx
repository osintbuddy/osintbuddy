import { useCallback, useEffect, useState } from 'preact/hooks'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { Hero } from '@/components/docs/Hero'
import Prose from '@/components/docs/Prose'
import Markdoc from '@markdoc/markdoc'
import React from 'preact/compat'
import nodes from '@/app/nodes'
import tags from '@/app/tags'

const navigation = [
  {
    title: 'What is OSINTBuddy',
    links: [
      { title: 'Overview', href: '/docs/overview' },
      { title: 'Vision and motivation', href: '/docs/vision' },
      { title: 'Roadmap and history ', href: '/docs/roadmap' },
      { title: 'Get involved', href: '/docs/getting-started' },
      { title: 'Installation', href: '/docs/installation' },
    ],
  },
  {
    title: 'Core concepts',
    links: [
      {
        title: 'Graphs',
        href: '/docs/core/project-graphs',
      },
      { title: 'Transforms *', href: '/docs/core/transforms' },
      {
        title: 'Entities *',
        href: '/docs/core/entities',
      },
    ],
  },
  {
    title: 'Advanced guides',
    links: [
      {
        title: 'Plugin System Overview',
        href: '/docs/guides/plugin-system',
      },
      {
        title: 'Writing plugins',
        href: '/docs/guides/writing-plugins',
      },
      {
        title: 'Plugin recipes *',
        href: '/docs/guides/plugin-recipes',
      },
    ],
  },
  {
    title: 'API reference',
    links: [
      { title: 'Plugin *', href: '/docs/ref/plugins-api' },
      { title: 'Transform *', href: '/docs/ref/transforms-api' },
      { title: 'Entities *', href: '/docs/ref/entities-api' },
      { title: 'Settings *', href: '/docs/ref/settings-api' },
      { title: 'Registry *', href: '/docs/ref/registry-api' },
    ],
  },
  {
    title: 'Contributing',
    links: [
      { title: 'How to contribute', href: '/docs/contrib/how-to-contribute' },
      { title: 'Code of Conduct', href: '/docs/contrib/conduct' },
      { title: 'Architecture guide', href: '/docs/contrib/architecture-guide' },
      { title: 'Bugs and Security', href: '/docs/contrib/bugs-security' },
    ],
  },
]

function useTableOfContents(tableOfContents: any) {
  let [currentSection, setCurrentSection] = useState(tableOfContents[0]?.id)

  let getHeadings = useCallback((tableOfContents: any) => {
    return tableOfContents
      .flatMap((node: any) => [
        node.id,
        ...node.children.map((child: any) => child.id),
      ])
      .map((id: any) => {
        let el = document.getElementById(id)
        if (!el) return

        let style = window.getComputedStyle(el)
        let scrollMt = parseFloat(style.scrollMarginTop)

        let top = window.scrollY + el.getBoundingClientRect().top - scrollMt
        return { id, top }
      })
  }, [])

  useEffect(() => {
    if (tableOfContents.length === 0) return
    let headings = getHeadings(tableOfContents)
    function onScroll() {
      let top = window.scrollY
      let current = headings[0].id
      for (let heading of headings) {
        if (top >= heading.top) {
          current = heading.id
        } else {
          break
        }
      }
      setCurrentSection(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [getHeadings, tableOfContents])

  return currentSection
}

function Navigation({ navigation }: any) {
  const location = useLocation()
  return (
    <nav className='px-6 text-base lg:text-sm'>
      <ul role='list' className='space-y-9'>
        {navigation.map((section: any) => (
          <li key={section.title}>
            <h2 className='font-display text-slate-350 font-semibold'>
              {section.title}
            </h2>
            <ul
              role='list'
              className='dark:border-mirage-300 mt-2 space-y-2 border-l-2 border-slate-100 lg:mt-4 lg:space-y-4 lg:border-slate-200'
            >
              {section.links.map((link: any) => (
                <li key={link.href} className='relative'>
                  <NavLink
                    to={link.href}
                    className={`block w-full border-b-0 pl-3.5 before:pointer-events-none before:absolute before:top-1/2 before:-left-1 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-sm ${
                      link.href === location.pathname
                        ? 'text-primary-200 before:bg-primary-200 font-semibold'
                        : 'text-slate-500 before:hidden before:bg-slate-300 hover:text-slate-600 hover:before:block dark:text-slate-400 dark:before:bg-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {/* after:border-t-primary-400  after:absolute after:border-solid after:-rotate-90 after:-translate-y-1/2 after:border-t-8 after:border-x-transparent after:border-x-8 */}
                    {link.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function getNodeText(node: any) {
  let text = ''
  for (let child of node.children ?? []) {
    if (typeof child === 'string') {
      text += child
    }
    text += getNodeText(child)
  }
  return text
}

function collectHeadings(nodes: any): any {
  let sections = []

  for (let node of nodes) {
    if (node.name === 'h2' || node.name === 'h3') {
      let title = getNodeText(node)
      if (title) {
        // let id = slugify(title)
        node.attributes.id = title.toLowerCase().replace(' ', '-')
        if (node.name === 'h3') {
          if (!sections[sections.length - 1]) {
            throw new Error(
              'Cannot add `h3` to table of contents without a preceding `h2`'
            )
          }
          sections[sections.length - 1].children.push({
            ...node.attributes,
            title,
          })
        } else {
          sections.push({ ...node.attributes, title, children: [] })
        }
      }
    }

    sections.push(...collectHeadings(node.children ?? []))
  }

  return sections
}

export default function Documentation() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    // redirect on /docs/ visit because we don't want to show blank content
    if (location.pathname.length <= 6) navigate('/docs/overview')
  })

  // dynamically import the relevent .md file for the given /docs/* URL
  const [attrs, setAttrs] = useState({
    pageTitle: '',
    title: '',
    description: '',
  })
  const [source, setSource] = useState('')
  import(`./${location.pathname.replace('/docs/', '')}.md`).then(
    ({ attributes, markdown }) => {
      setAttrs(attributes)
      setSource(markdown)
    }
  )

  useEffect(() => {
    document.title = attrs.title
    const meta = document.getElementsByTagName('META')[2]
    if (meta) (meta as HTMLMetaElement).content = attrs.description
  }, [attrs])

  let tableOfContents = source ? collectHeadings(source) : []

  let isHomePage = location.pathname === '/docs/overview'
  let allLinks = navigation.flatMap((section) => section.links)
  let linkIndex = allLinks.findIndex((link) => link.href === location.pathname)
  let previousPage = allLinks[linkIndex - 1]
  let nextPage = allLinks[linkIndex + 1]
  let section = navigation.find((section) =>
    section.links.find((link) => link.href === location.pathname)
  )
  let currentSection = useTableOfContents(tableOfContents)

  function isActive(section: any) {
    if (section.id === currentSection) {
      return true
    }
    if (!section.children) {
      return false
    }
    return section.children.findIndex(isActive) > -1
  }

  const ast = Markdoc.parse(source)
  // @ts-ignore
  const content = Markdoc.transform(ast, { nodes, tags })

  return (
    <>
      {isHomePage && <Hero />}
      <div className='relative flex w-full justify-center self-center rounded-t-2xl border border-slate-700/10 bg-gradient-to-tr from-black/60 to-black/30 shadow-2xl ring-1 shadow-black/50 ring-slate-700/10 backdrop-blur-sm md:max-w-5/6 lg:px-10'>
        <div className='via-primary-700 absolute top-11 bottom-20 -left-px h-2/3 w-px bg-gradient-to-b from-blue-400/0 to-blue-400/0' />
        <div className='hidden lg:relative lg:block lg:flex-none'>
          <div className='sticky top-[4.5rem] h-[calc(100vh-4.5rem)] overflow-x-hidden overflow-y-auto py-16'>
            <Navigation
              navigation={navigation}
              className='w-72 pr-8 xl:w-72 xl:pr-16'
            />
          </div>
        </div>
        <div className='max-w-5/6 min-w-0 flex-auto py-16 md:px-4 lg:max-w-none lg:pr-0 lg:pl-8 xl:px-16'>
          <article>
            {(attrs.title || section) && (
              <header className='mb-3 space-y-1'>
                {section && (
                  <p className='font-display text-md text-primary-200 font-medium'>
                    {section.title}
                  </p>
                )}
                {attrs.pageTitle && (
                  <h1 className='font-display text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-300/90'>
                    {attrs.pageTitle}
                  </h1>
                )}
              </header>
            )}
            <Prose>{Markdoc.renderers.react(content, React)}</Prose>
          </article>
          <dl className='mt-12 flex border-t border-slate-800 pt-6'>
            {previousPage && (
              <div>
                <dt className='font-display text-sm font-medium text-slate-900 dark:text-slate-300/90'>
                  Previous
                </dt>
                <dd className='mt-1'>
                  <NavLink
                    to={previousPage.href}
                    className='text-base font-semibold text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300'
                  >
                    <span aria-hidden='true'>&larr;</span> {previousPage.title}
                  </NavLink>
                </dd>
              </div>
            )}
            {nextPage && (
              <div className='ml-auto text-right'>
                <dt className='font-display text-sm font-medium text-slate-900 dark:text-slate-300/90'>
                  Next
                </dt>
                <dd className='mt-1'>
                  <NavLink
                    to={nextPage.href}
                    className='text-base font-semibold text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300'
                  >
                    {nextPage.title} <span aria-hidden='true'>&rarr;</span>
                  </NavLink>
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className='hidden xl:sticky xl:top-[4.5rem] xl:-mr-6 xl:block xl:h-[calc(100vh-4.5rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6'>
          <nav aria-labelledby='on-this-page-title' className='w-56'>
            {tableOfContents.length > 0 && (
              <>
                <h2
                  id='on-this-page-title'
                  className='font-display text-sm font-medium text-slate-900 dark:text-slate-300'
                >
                  On this page
                </h2>
                <ol role='list' className='mt-4 space-y-3 text-sm'>
                  {tableOfContents.map((section: any) => (
                    <li key={section.id}>
                      <h3>
                        <NavLink
                          to={`#${section.id}`}
                          className={
                            isActive(section)
                              ? 'text-primary-100'
                              : 'font-normal text-slate-500 hover:text-slate-700 dark:text-slate-400/90 dark:hover:text-slate-300/90'
                          }
                        >
                          {section.title}
                        </NavLink>
                      </h3>
                      {section.children.length > 0 && (
                        <ol
                          role='list'
                          className='mt-2 space-y-3 pl-5 text-slate-500/90 dark:text-slate-400/90'
                        >
                          {section.children.map((subSection: any) => (
                            <li key={subSection.id}>
                              <NavLink
                                to={`#${subSection.id}`}
                                className={
                                  isActive(subSection)
                                    ? 'text-primary-100'
                                    : 'hover:text-slate-600 dark:hover:text-slate-300/90'
                                }
                              >
                                {subSection.title}
                              </NavLink>
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}
