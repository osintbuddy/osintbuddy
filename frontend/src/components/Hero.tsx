import { Fragment, } from 'preact/compat'
import { Highlight } from 'prism-react-renderer'
import { HeroBackground } from './HeroBackground'
import blurCyanImage from '@/assets/images/blur-cyan.png'
import blurIndigoImage from '@/assets/images/blur-indigo.png'
import Button from './buttons'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icons'
import { toast } from 'react-toastify'

const codeLanguage = 'python'
const code = `class URL(ob.Plugin):
    label = "URL"
    color = "#642CA9"
    entity = [TextInput(label="URL", icon="link")]
    author = ["Team@OSIB"]
    icon = "link"

    @ob.transform(label="To website", icon="world-www")
    async def transform_to_website(self, node, **kwargs):
        website_entity = await ob.Registry.get_plugin('website')
        domain = urlparse(node.url).netloc
        return website_entity.blueprint(domain=domain)


class UsernameProfile(ob.Plugin):
    label = "Username Profile"
    color = "#D842A6"
    icon = "user-scan"
    author = "Team@OSIB"
    
    entity = [
        TextInput(label='Link', icon='link'),
        TextInput(label='Category', icon='category'),
        TextInput(label='Site', icon='world'),
        TextInput(label='Username', icon='user'),
    ]

    @ob.transform(label="To URL", icon="link")
    async def transform_to_url(self, node, use):
        url_entity = await ob.Registry.get_plugin('url')
        url_node = url_entity.blueprint(
            url=node.link
        )
        return url_node`

const tabs = [
  { name: 'google.plugin.py', isActive: true },
  { name: 'shodan.plugin.py', isActive: false },
]

function TrafficLightsIcon(props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 42 10" fill="none" {...props}>
      <circle cx="5" cy="5" r="4.5" />
      <circle cx="21" cy="5" r="4.5" />
      <circle cx="37" cy="5" r="4.5" />
    </svg>
  )
}

const QUOTES = [
  "Vision is the art of seeing insight in the invisible",
  "Find the connections that matter to you",
  "Vision is the art of seeing insight in the invisible",
  "Unlock the potential of public data",
  "Vision is the art of seeing insight in the invisible",
  "Transform data into connected knowledge",
]
"/docs/intro/roadmap"

export function Hero() {
  const navigate = useNavigate()

  return (
    <div className="z-10 overflow-hidden bg-gradient-to-b dark:pt-[4.5rem] dark:lg:mt-[-4.75rem] dark:lg:pt-[4.75rem] pb-12">
      <div className="py-10 px-3 lg:relative lg:py-10 pb-40 lg:pb-36 lg:px-0">
        <div className='mx-auto grid grid-cols-1 max-w-7xl items-center gap-y-16 lg:grid-cols-2 '>
          <div className='relative px-3 z-10 md:text-center lg:text-left'>
            <div className='relative  '>
              <h2 className='inline bg-gradient-to-br from-primary-300 via-primary-200 to-primary-300 bg-clip-text text-3xl md:text-4xl font-display font-medium tracking-tight text-transparent md:leading-11 max-w-lg md:px-0 whitespace-pre-line'>
                Elevate your Research with Strategic Insights from Public Data
              </h2>
              <p className='pt-1 text-slate-350 '>
                Reveal the connections that shape our world and stay informed with targeted insights from public data. From defending against cyber threats to beyond, visualize the invisible with OSINTBuddy.
              </p>
              <div className='mt-5 lg:mt-4 flex-wrap flex gap-4 md:justify-center lg:justify-start'>
                <Button.Solid
                  variant='primary'
                  disabled
                  onClick={() => toast.warn("The marketplace isn't available yet.")}
                >
                  Marketplace
                  <Icon icon="lock-exclamation" className="btn-icon" />
                </Button.Solid>
                <Button.Ghost
                  variant='primary'
                  onClick={() => navigate("/docs/intro/roadmap")}
                >
                  View Roadmap
                  <Icon icon="road" className="btn-icon" />
                </Button.Ghost>

              </div>
            </div>
          </div>
          <div className="relative lg:static ">
            <div className="absolute inset-x-[-50vw] -top-32 -bottom-48 [mask-image:linear-gradient(transparent,white,white)] dark:[mask-image:linear-gradient(transparent,black,transparent)] lg:left-[calc(50%+14rem)] lg:right-0 lg:-top-32 lg:-bottom-32 lg:[mask-image:none] lg:dark:[mask-image:linear-gradient(white,white,transparent)]">
              <HeroBackground className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 lg:translate-y-[-60%]" />
            </div>
            <div className="relative">
              <img
                className="absolute -top-64 -right-64"
                src={blurCyanImage}
                alt=""
                width={530}
                height={530}
              />
              <img
                className="absolute -bottom-40 -right-44"
                src={blurIndigoImage}
                alt=""
                width={567}
                height={567}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-mirage-800/40 via-primary-300/70 to-primary-600/20 opacity-10 blur-lg" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-mirage-800/40 via-primary-300/70 to-primary-600/20 opacity-10" />
              <div className="relative rounded-2xl bg-black/60 ring-1 ring-slate-400/10 backdrop-blur">
                <div className="absolute -top-px left-20  h-px bg-gradient-to-r from-primary-300/10 via-primary-300/70 to-primary-300/0" />
                <div className="absolute -bottom-px left-11 right-20 h-px bg-gradient-to-r from-blue-400/0 via-primary-400 to-blue-400/0" />
                <div className="pl-4 pt-4 max-h-[28.5rem] overflow-y-scroll">
                  <TrafficLightsIcon className="h-2.5 w-auto stroke-slate-600/30" />
                  <div className="mt-4 flex space-x-2 text-xs">
                    {tabs.map((tab) => (
                      <div
                        key={tab.name}
                        className={
                          `flex h-6 rounded-full py-0.5 ${tab.isActive
                            ? 'bg-gradient-to-br from-black/10 via-black/20 to-black/10 p-px font-medium text-primary-200'
                            : 'text-slate-600'}`}
                      >
                        <div
                          className={`flex items-center rounded-full py-0.5 px-2.5 ${tab.isActive && 'bg-black/20'}`}
                        >
                          {tab.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-start px-1 text-sm">
                    <div
                      aria-hidden="true"
                      className="select-none  border-r border-slate-500/10 pr-4 font-mono text-slate-700/70"
                    >
                      {Array.from({
                        length: code.split('\n').length,
                      }).map((_, index) => (
                        <Fragment key={index}>
                          {(index + 1).toString().padStart(2, '0')}
                          <br />
                        </Fragment>
                      ))}
                    </div>
                    <Highlight
                      code={code}
                      language={codeLanguage}
                    >
                      {({
                        className,
                        style,
                        tokens,
                        getLineProps,
                        getTokenProps,
                      }) => (
                        <pre
                          className={
                            className +
                            ' flex overflow-x-auto'
                          }
                        >
                          <code >
                            {tokens.map((line, lineIndex) => (
                              <div key={lineIndex} {...getLineProps({ line })}>
                                {line.map((token, tokenIndex) => (
                                  <span
                                    key={tokenIndex}
                                    {...getTokenProps({ token })}
                                  />
                                ))}
                              </div>
                            ))}
                          </code>
                        </pre>
                      )}
                    </Highlight>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
