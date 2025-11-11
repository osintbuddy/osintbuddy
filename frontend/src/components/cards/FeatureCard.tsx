import { Icon } from '../icons'

interface FeatureCardProps {
  title: string
  description: string
  iconClass: string
  icon: string
  comingSoon?: boolean
}

export default function FeatureCard({
  title,
  description,
  iconClass,
  icon = 'affiliate',
  comingSoon,
}: FeatureCardProps) {
  return (
    <div className='grid-gradient-cover border-mirage-800 relative w-full max-w-1/3 border'>
      <section class='flex flex-col px-6 py-8'>
        <div className='flex items-center pb-1'>
          <span className='flex items-center text-3xl'>
            /&nbsp;
            <Icon
              icon={icon}
              className={`'absolute size-8 ${iconClass ?? 'text-indigo-600'}`}
            />
            &nbsp;/
          </span>
          <h2 class='text-slate-350/90 font-art text-2xl font-medium uppercase'>
            &nbsp;
            {title}
          </h2>
        </div>
        <p className='pt-2 text-lg'>{description}</p>
        {comingSoon && (
          <p className='bg-backdrop-400 absolute -right-3 -bottom-3 flex text-slate-400 uppercase'>
            <span className='text-art rounded-xs border border-amber-600 px-4 py-1 text-sm'>
              NOT COMPLETED
            </span>
          </p>
        )}
      </section>
    </div>
  )
}
