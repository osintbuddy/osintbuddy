import { Fragment } from 'preact/compat'
import { Highlight, themes } from 'prism-react-renderer'
import { HeroBackground } from './HeroBackground'
import blurCyanImage from '@/assets/images/blur-cyan.png'
import blurIndigoImage from '@/assets/images/blur-indigo.png'
import Button from '../buttons'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../icons'
import { toast } from 'react-toastify'

const codeLanguage = 'python'
const code = `import osintbuddy as ob
from urllib.parse import urlparse

class URL(ob.Plugin):
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
`

const tabs = [
  { name: 'url.plugin.py', isActive: true },
  { name: 'shodan.plugin.py', isActive: false },
  { name: 'searxng.plugin.py', isActive: false },
]

const QUOTES = [
  'Vision is the art of seeing insight in the invisible',
  'Find the connections that matter to you',
  'Vision is the art of seeing insight in the invisible',
  'Unlock the potential of public data',
  'Vision is the art of seeing insight in the invisible',
  'Transform data into connected knowledge',
]
;('/docs/intro/roadmap')

export function Hero() {
  const navigate = useNavigate()

  return (
    <div className='z-10 overflow-hidden bg-gradient-to-b pt-6 pb-12 lg:mt-[-4.75rem] lg:pt-[4.75rem]'>
      <div className='pb-40 lg:relative lg:px-0 lg:py-10 lg:pb-36'>
        <div className='mx-auto grid grid-cols-1 gap-y-16 px-4 md:max-w-5/6 md:px-0 lg:grid-cols-2'>
          <div className='relative z-10 lg:mt-28'>
            <h2 className='from-primary-100 to-primary-200 font-display inline max-w-md bg-gradient-to-br via-blue-500 bg-clip-text text-3xl font-medium tracking-tight whitespace-pre-line text-transparent md:px-0 md:text-3xl md:leading-11'>
              Leverage the power of public data to fuel
              <br /> your research and uncover hidden connections
            </h2>
            <div className='max-w-2xl pt-1 text-slate-300'>
              <p>
                Reveal the insights that shape our world and stay informed
                through the power of public data. See the connections,
                understand the data. From defending against cyber threats to
                uncovering scientific misconduct, visualize the invisible with
                OSINTBuddy.
              </p>
              <div className='mt-5 flex flex-wrap gap-4 lg:mt-4'>
                <Button.Solid
                  variant='primary'
                  disabled
                  onClick={() =>
                    toast.warn("The marketplace isn't available yet.")
                  }
                >
                  Marketplace
                  <Icon icon='lock-exclamation' className='btn-icon' />
                </Button.Solid>
                <Button.Ghost
                  variant='primary'
                  onClick={() => navigate('/docs/roadmap')}
                >
                  View Roadmap
                  <Icon icon='road' className='btn-icon' />
                </Button.Ghost>
              </div>
            </div>
          </div>
          <div className='relative lg:static'>
            <div className='absolute inset-x-[-50vw] -top-32 -bottom-48 [mask-image:linear-gradient(transparent,white,white)] select-none lg:-top-32 lg:right-0 lg:-bottom-32 lg:left-[calc(50%+14rem)] lg:[mask-image:none] dark:[mask-image:linear-gradient(transparent,black,transparent)] lg:dark:[mask-image:linear-gradient(white,white,transparent)]'>
              <HeroBackground className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-0 lg:translate-x-0 lg:translate-y-[-60%]' />
            </div>
            <div className='relative'>
              <img
                className='absolute -top-64 -right-64 select-none'
                src={blurCyanImage}
                alt=''
                width={530}
                height={530}
              />
              <img
                className='absolute -right-44 -bottom-40 select-none'
                src={blurIndigoImage}
                alt=''
                width={567}
                height={567}
              />
              <div className='from-mirage-800/40 via-primary-300/70 to-primary-600/20 absolute inset-0 rounded-2xl bg-gradient-to-tr opacity-10 blur-lg' />
              <div className='from-mirage-800/40 via-primary-300/70 to-primary-600/20 absolute inset-0 rounded-2xl bg-gradient-to-tr opacity-10' />
              <div className='relative rounded-2xl bg-gradient-to-br from-black/60 to-black/50 ring-1 ring-slate-400/10 backdrop-blur-xs'>
                <div className='from-primary-300/10 via-primary-300/70 to-primary-300/0 absolute -top-px left-20 h-px bg-gradient-to-r' />
                <div className='via-primary-400 absolute right-20 -bottom-px left-11 h-px bg-gradient-to-r from-blue-400/0 to-blue-400/0' />
                <div className='overflow-y-scroll pt-4 pl-4'>
                  <div className='mb-4 grid w-10 grid-cols-3 gap-x-2'>
                    <Icon icon='circle' className='!h-3 text-slate-600/30' />
                    <Icon icon='circle' className='!h-3 text-slate-600/30' />
                    <Icon icon='circle' className='!h-3 text-slate-600/30' />
                  </div>
                  <div className='flex text-sm'>
                    {tabs.map((tab) => (
                      <div
                        key={tab.name}
                        className={`flex h-8 rounded-full px-2 ${
                          tab.isActive
                            ? 'text-primary-200 bg-black font-medium'
                            : 'text-slate-600'
                        }`}
                      >
                        <p
                          className={`flex items-center rounded-full px-2.5 py-0.5 select-none`}
                        >
                          {tab.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className='mt-6 flex items-start px-1 text-sm'>
                    <div
                      aria-hidden='true'
                      className='border-r border-slate-500/10 pr-4 font-mono text-slate-700/70 select-none'
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
                      theme={themes.oneDark}
                    >
                      {({
                        className,
                        style,
                        tokens,
                        getLineProps,
                        getTokenProps,
                      }) => (
                        <pre
                          className={className + ' flex overflow-x-auto'}
                          style={{ ...style, backgroundColor: 'transparent' }}
                        >
                          <code>
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
