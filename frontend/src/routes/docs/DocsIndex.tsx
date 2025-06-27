import { useCallback, useEffect, useState } from "preact/hooks"
import { NavLink, Outlet, useLocation } from "react-router-dom"

import { Hero } from "@/components/Hero"
import Prose from "@/components/Prose"
import Markdoc from "@markdoc/markdoc"
import React from 'preact/compat'
import nodes from '@/markdoc/nodes'
import tags from '@/markdoc/tags'

const navigation = [
  {
    title: 'Introduction',
    links: [
      { title: 'Introduction', href: '/docs/index' },
      { title: 'Get involved', href: '/docs/intro/getting-started' },
      { title: 'Roadmap', href: '/docs/intro/roadmap' },
      { title: 'Installation (Alpha)', href: '/docs/intro/installation' },
    ],
  },
  {
    title: 'Core concepts',
    links: [
      {
        title: 'Understanding OSINTBuddy',
        href: '/docs/understanding-osintbuddy',
      },
      {
        title: 'Graphs',
        href: '/docs/project-graphs',
      },
      { title: 'Transforms *', href: '/docs/transforms' },
      {
        title: 'Entities *',
        href: '/docs/entities',
      },
    ],
  },
  {
    title: 'Advanced guides',
    links: [
      {
        title: 'Plugin System Overview',
        href: '/docs/plugin-system',
      },
      {
        title: 'Writing plugins',
        href: '/docs/writing-plugins',
      },
      {
        title: 'Plugin recipes *',
        href: '/docs/plugin-recipes'
      },
    ],
  },
  {
    title: 'API reference',
    links: [
      { title: 'Plugin *', href: '/docs/plugins-api' },
      { title: 'Transform *', href: '/docs/transforms-api' },
      { title: 'Entities *', href: '/docs/entities-api' },
      { title: 'Settings *', href: '/docs/settings-api' },
      { title: 'Registry *', href: '/docs/registry-api' },
    ],
  },
  {
    title: 'Contributing',
    links: [
      { title: 'How to contribute', href: '/docs/how-to-contribute' },
      { title: 'Architecture guide', href: '/docs/architecture-guide' },
    ],
  },
]

function useTableOfContents(tableOfContents: any) {
  let [currentSection, setCurrentSection] = useState(tableOfContents[0]?.id)

  let getHeadings = useCallback((tableOfContents: any) => {
    return tableOfContents
      .flatMap((node: any) => [node.id, ...node.children.map((child: any) => child.id)])
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
    <nav className='text-base lg:text-sm px-4'>
      <ul role="list" className="space-y-9">
        {navigation.map((section: any) => (
          <li key={section.title}>
            <h2 className="font-display font-medium text-slate-900 dark:text-slate-300">
              {section.title}
            </h2>
            <ul
              role="list"
              className="mt-2 space-y-2 border-l-2 border-slate-100 dark:border-mirage-300 lg:mt-4 lg:space-y-4 lg:border-slate-200"
            >
              {section.links.map((link: any) => (
                <li key={link.href} className="relative">
                  <NavLink
                    to={link.href}
                    className={
                      `block w-full pl-3.5 before:pointer-events-none before:absolute before:-left-1 before:top-1/2 before:h-1.5 before:w-1.5  border-b-0 before:-translate-y-1/2 before:rounded-sm ${link.href === location.pathname
                        ? 'font-semibold text-primary-300 before:bg-primary-300'
                        : 'text-slate-500 before:hidden before:bg-slate-300 hover:text-slate-600 hover:before:block dark:text-slate-400 dark:before:bg-slate-700 dark:hover:text-slate-300'}`
                    }
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
  const pageProps: any = {}
  const location = useLocation();
  const docPage = `./pages/${location.pathname.replace("/docs/", '')}.md`;

  const [attrs, setAttrs] = useState({})
  const [source, setSource] = useState("");

  console.log('importing doc', docPage)
  import(docPage).then(({ attributes, markdown }) => {
    setAttrs(attributes)
    setSource(markdown)
    console.log('inside import attributes, markdown', attributes, markdown)
  })


  let title = attrs.title

  let pageTitle =
    attrs.pageTitle ||
    `${attrs.title} | OSINTBuddy Docs`

  let description = attrs.description

  let tableOfContents = source
    ? collectHeadings(source)
    : []

  console.log(location.pathname)
  let isHomePage = location.pathname === '/docs/index'
  console.log('isHomePage', isHomePage)
  let allLinks = navigation.flatMap((section) => section.links)
  let linkIndex = allLinks.findIndex((link) => link.href === location.pathname)
  let previousPage = allLinks[linkIndex - 1]
  let nextPage = allLinks[linkIndex + 1]
  let section = navigation.find((section) =>
    section.links.find((link) => {
      console.log('section find', link.href, location.pathname)
      return link.href === location.pathname
    })
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
  const content = Markdoc.transform(ast, { nodes, tags })

  console.log('whereami?!?!')
  return (
    <>
      {isHomePage && <Hero />}
      <div className="relative self-center border rounded-t-2xl flex max-w-5/6 justify-center sm:px-2 lg:px-10 border-slate-700/10 shadow-black/50 shadow-2xl to-black/25 from-black/15 bg-gradient-to-tl w-full backdrop-blur-sm">
        <div className="hidden lg:relative lg:block lg:flex-none">
          <div className="sticky top-[4.5rem] h-[calc(100vh-4.5rem)] overflow-y-auto overflow-x-hidden py-16 ">
            <Navigation
              navigation={navigation}
              className="w-72 pr-8 xl:w-72 xl:pr-16"
            />
          </div>
        </div>
        <div className="min-w-0 max-w-5/6 flex-auto px-4 py-16 lg:max-w-none lg:pr-0 lg:pl-8 xl:px-16 ">
          <article>
            {(title || section) && (
              <header className="mb-7 space-y-1">
                {section && (
                  <p className="font-display text-sm font-medium text-primary-100">
                    {section.title}
                  </p>
                )}
                {title && (
                  <h1 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-300/90">
                    {title}
                  </h1>
                )}
              </header>
            )}
            <Prose>
              {Markdoc.renderers.react(content, React)}
            </Prose>
          </article>
          <dl className="mt-12 flex border-t border-slate-200 pt-6 dark:border-slate-800">
            {previousPage && (
              <div>
                <dt className="font-display text-sm font-medium text-slate-900 dark:text-slate-300/90">
                  Previous
                </dt>
                <dd className="mt-1">
                  <NavLink
                    to={previousPage.href}
                    className="text-base font-semibold text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
                  >
                    <span aria-hidden="true">&larr;</span> {previousPage.title}
                  </NavLink>
                </dd>
              </div>
            )}
            {nextPage && (
              <div className="ml-auto text-right">
                <dt className="font-display text-sm font-medium text-slate-900 dark:text-slate-300/90">
                  Next
                </dt>
                <dd className="mt-1">
                  <NavLink
                    to={nextPage.href}
                    className="text-base font-semibold text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
                  >
                    {nextPage.title} <span aria-hidden="true">&rarr;</span>
                  </NavLink>
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="hidden xl:sticky xl:top-[4.5rem] xl:-mr-6 xl:block xl:h-[calc(100vh-4.5rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6">
          <nav aria-labelledby="on-this-page-title" className="w-56">
            {tableOfContents.length > 0 && (
              <>
                <h2
                  id="on-this-page-title"
                  className="font-display text-sm font-medium text-slate-900 dark:text-slate-300"
                >
                  On this page
                </h2>
                <ol role="list" className="mt-4 space-y-3 text-sm">
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
                          role="list"
                          className="mt-2 space-y-3 pl-5 text-slate-500/90 dark:text-slate-400/90"
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