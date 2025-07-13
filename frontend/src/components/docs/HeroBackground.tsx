import type { JSX } from 'preact'

interface SvgProps extends JSX.InputHTMLAttributes<SVGSVGElement> {}

export function HeroBackground(props: SvgProps) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 668 1069'
      width={668}
      height={1029}
      fill='none'
      {...props}
    >
      <defs>
        <pattern
          id='grid'
          width='100'
          height='100'
          patternUnits='userSpaceOnUse'
        >
          <path
            d='M 100 0 L 0 0 0 100'
            fill='none'
            stroke='#0a347c10'
            stroke-width='1'
            opacity='0.3'
          />
        </pattern>

        <linearGradient
          id='flowingConnection'
          x1='0%'
          y1='0%'
          x2='100%'
          y2='0%'
        >
          <stop offset='0%' style='stop-color:#0215FF;stop-opacity:0' />
          <stop offset='30%' style='stop-color:#0215FF;stop-opacity:0.8' />
          <stop offset='70%' style='stop-color:#06b6d4;stop-opacity:0.8' />
          <stop offset='100%' style='stop-color:#06b6d4;stop-opacity:0' />
          <animateTransform
            attributeName='gradientTransform'
            type='translate'
            values='0,0; 90,0; 100,0'
            dur='14s'
            repeatCount='indefinite'
          />
        </linearGradient>

        <filter id='glow' x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur stdDeviation='3' result='coloredBlur' />
          <feMerge>
            <feMergeNode in='coloredBlur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
        <filter id='strongGlow' x='-100%' y='-100%' width='300%' height='300%'>
          <feGaussianBlur stdDeviation='6' result='coloredBlur' />
          <feMerge>
            <feMergeNode in='coloredBlur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>

        <filter id='subtleGlow'>
          <feGaussianBlur stdDeviation='2' result='coloredBlur' />
          <feMerge>
            <feMergeNode in='coloredBlur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g>
        <rect width='1920' height='1080' fill='url(#grid)' />
        <circle
          cx='284'
          cy='350'
          r='5'
          fill='#0a347c90'
          stroke='#22d3ee20'
          strokeWidth='1.5'
        />
        <circle
          cx='434'
          cy='346'
          r='5'
          fill='#0a347c90'
          stroke='#10b98130'
          strokeWidth='1.5'
        />
        <circle
          cx='484'
          cy='750'
          r='7'
          fill='#0a347c90'
          stroke='#f59e0b16'
          strokeWidth='2'
        />
        <circle r='3' fill='#0215FF' fillOpacity='0.6'>
          <animateMotion
            dur='26s'
            repeatCount='indefinite'
            path='M584.5 770.4v-474M484.5 770.4v-474M384.5 770.4v-474M283.5 769.4v-474M183.5 768.4v-474M83.5 767.4v-474'
          />
        </circle>
        <circle r='2.5' fill='#22d3ee' fillOpacity='0.5'>
          <animateMotion
            dur='12s'
            repeatCount='indefinite'
            path='M83.5 221.275v6.587a50.1 50.1 0 0 0 22.309 41.686l55.581 37.054a50.102 50.102 0 0 1 22.309 41.686v6.587M83.5 716.012v6.588a50.099 50.099 0 0 0 22.309 41.685l55.581 37.054a50.102 50.102 0 0 1 22.309 41.686v6.587M183.7 584.5v6.587a50.1 50.1 0 0 0 22.31 41.686l55.581 37.054a50.097 50.097 0 0 1 22.309 41.685v6.588M384.101 277.637v6.588a50.1 50.1 0 0 0 22.309 41.685l55.581 37.054a50.1 50.1 0 0 1 22.31 41.686v6.587M384.1 770.288v6.587a50.1 50.1 0 0 1-22.309 41.686l-55.581 37.054A50.099 50.099 0 0 0 283.9 897.3v6.588'
          />
        </circle>
        <circle r='2' fill='#64748b' fillOpacity='0.4'>
          <animateMotion
            dur='17s'
            repeatCount='indefinite'
            path='M384.1 770.288v6.587a50.1 50.1 0 0 1-22.309 41.686l-55.581 37.054A50.099 50.099 0 0 0 283.9 897.3v6.588M484.3 594.937v6.587a50.1 50.1 0 0 1-22.31 41.686l-55.581 37.054A50.1 50.1 0 0 0 384.1 721.95v6.587M484.3 872.575v6.587a50.1 50.1 0 0 1-22.31 41.686l-55.581 37.054a50.098 50.098 0 0 0-22.309 41.686v6.582M584.501 663.824v39.988a50.099 50.099 0 0 1-22.31 41.685l-55.581 37.054a50.102 50.102 0 0 0-22.309 41.686v6.587M283.899 945.637v6.588a50.1 50.1 0 0 1-22.309 41.685l-55.581 37.05a50.12 50.12 0 0 0-22.31 41.69v6.59M384.1 277.637c0 19.946 12.763 37.655 31.686 43.962l137.028 45.676c18.923 6.308 31.686 24.016 31.686 43.962M183.7 463.425v30.69c0 21.564 13.799 40.709 34.257 47.529l134.457 44.819c18.922 6.307 31.686 24.016 31.686 43.962M83.5 102.288c0 19.515 13.554 36.412 32.604 40.645l235.391 52.309c19.05 4.234 32.605 21.13 32.605 40.646M83.5 463.425v-58.45M183.699 542.75V396.625M283.9 1068.8V945.637M83.5 363.225v-141.95M83.5 179.524v-77.237M83.5 60.537V0M384.1 630.425V277.637M484.301 830.824V594.937M584.5 1068.8V663.825M484.301 555.275V452.988M584.5 622.075V452.988M384.1 728.537v-56.362M384.1 1068.8v-20.88M384.1 1006.17V770.287M283.9 903.888V759.85M183.699 1066.71V891.362M83.5 1068.8V716.012M83.5 674.263V505.175'
          />
        </circle>

        <circle r='2.5' fill='#0215FF' fillOpacity='0.5'>
          <animateMotion
            dur='26s'
            repeatCount='indefinite'
            d='M580 720 Q 780 660, 980 720 Q 1180 780, 1380 720'
          />
        </circle>

        <circle r='3' fill='rgba(0, 80, 253, 1)' fillOpacity='0.6'>
          <animateMotion
            dur='10s'
            repeatCount='indefinite'
            d='M620 890 Q 820 830, 1020 890 Q 1220 950, 1420 890'
          />
        </circle>

        <circle r='2' fill='#64748b' fillOpacity='0.3'>
          <animateMotion
            dur='12s'
            repeatCount='indefinite'
            d='M600 50 Q 580 200, 620 350 Q 640 500, 600 650 Q 560 800, 620 950'
          />
        </circle>

        <circle r='2' fill='#64748b' fillOpacity='0.3'>
          <animateMotion
            dur='15s'
            repeatCount='indefinite'
            d='M1000 0 Q 1020 150, 980 300 Q 960 450, 1000 600 Q 1040 750, 980 900 Q 960 1050, 1000 1080'
          />
        </circle>

        <circle r='2' fill='#64748b' fillOpacity='0.3'>
          <animateMotion
            dur='11s'
            repeatCount='indefinite'
            d='M1400 50 Q 1380 200, 1420 350 Q 1440 500, 1400 650 Q 1360 800, 1420 950'
          />
        </circle>

        <rect
          width='1920'
          height='1080'
          fill='url(#grid)'
          filter='url(#glow)'
        />
        <circle r='3' fill='#0215FF' opacity='0.8'>
          <animateMotion dur='16s' repeatCount='indefinite'>
            <path d='M 960 540 Q 630 370 300 200' />
          </animateMotion>
        </circle>

        <circle r='2' fill='#06b6d4' opacity='0.6'>
          <animateMotion dur='12s' repeatCount='indefinite'>
            <path d='M 960 540 Q 1290 360 1620 180' />
          </animateMotion>
        </circle>

        <circle r='2.5' fill='#0215FF' opacity='0.7'>
          <animateMotion dur='10s' repeatCount='indefinite'>
            <path d='M 960 540 Q 1330 670 1700 800' />
          </animateMotion>
        </circle>

        <circle r='2' fill='#06b6d4' opacity='0.5'>
          <animateMotion dur='17s' repeatCount='indefinite'>
            <path d='M 960 540 Q 580 695 200 850' />
          </animateMotion>
        </circle>
      </g>

      <g opacity='.45' strokeWidth='3.5'>
        <path
          opacity='.3'
          d='M584.5 770.4v-474M484.5 770.4v-474M384.5 770.4v-474M283.5 769.4v-474M183.5 768.4v-474M83.5 767.4v-474'
          stroke='#12274C'
          strokeWidth='3'
          fill='none'
          filter='url(#glow)'
        />
        <path
          d='M83.5 221.275v6.587a50.1 50.1 0 0 0 22.309 41.686l55.581 37.054a50.102 50.102 0 0 1 22.309 41.686v6.587M83.5 716.012v6.588a50.099 50.099 0 0 0 22.309 41.685l55.581 37.054a50.102 50.102 0 0 1 22.309 41.686v6.587M183.7 584.5v6.587a50.1 50.1 0 0 0 22.31 41.686l55.581 37.054a50.097 50.097 0 0 1 22.309 41.685v6.588M384.101 277.637v6.588a50.1 50.1 0 0 0 22.309 41.685l55.581 37.054a50.1 50.1 0 0 1 22.31 41.686v6.587M384.1 770.288v6.587a50.1 50.1 0 0 1-22.309 41.686l-55.581 37.054A50.099 50.099 0 0 0 283.9 897.3v6.588'
          stroke='#12274C'
          strokeWidth='3'
          fill='none'
          filter='url(#glow)'
        />
        <path
          d='M384.1 770.288v6.587a50.1 50.1 0 0 1-22.309 41.686l-55.581 37.054A50.099 50.099 0 0 0 283.9 897.3v6.588M484.3 594.937v6.587a50.1 50.1 0 0 1-22.31 41.686l-55.581 37.054A50.1 50.1 0 0 0 384.1 721.95v6.587M484.3 872.575v6.587a50.1 50.1 0 0 1-22.31 41.686l-55.581 37.054a50.098 50.098 0 0 0-22.309 41.686v6.582M584.501 663.824v39.988a50.099 50.099 0 0 1-22.31 41.685l-55.581 37.054a50.102 50.102 0 0 0-22.309 41.686v6.587M283.899 945.637v6.588a50.1 50.1 0 0 1-22.309 41.685l-55.581 37.05a50.12 50.12 0 0 0-22.31 41.69v6.59M384.1 277.637c0 19.946 12.763 37.655 31.686 43.962l137.028 45.676c18.923 6.308 31.686 24.016 31.686 43.962M183.7 463.425v30.69c0 21.564 13.799 40.709 34.257 47.529l134.457 44.819c18.922 6.307 31.686 24.016 31.686 43.962M83.5 102.288c0 19.515 13.554 36.412 32.604 40.645l235.391 52.309c19.05 4.234 32.605 21.13 32.605 40.646M83.5 463.425v-58.45M183.699 542.75V396.625M283.9 1068.8V945.637M83.5 363.225v-141.95M83.5 179.524v-77.237M83.5 60.537V0M384.1 630.425V277.637M484.301 830.824V594.937M584.5 1068.8V663.825M484.301 555.275V452.988M584.5 622.075V452.988M384.1 728.537v-56.362M384.1 1068.8v-20.88M384.1 1006.17V770.287M283.9 903.888V759.85M183.699 1066.71V891.362M83.5 1068.8V716.012M83.5 674.263V505.175'
          stroke='#3F4EFF20'
          strokeWidth='3'
          fill='none'
          filter='url(#glow)'
        />
        <circle
          cx='83.5'
          cy='384.1'
          r='10.438'
          transform='rotate(-180 83.5 384.1)'
          fill='#0a347c90'
          stroke='#2A5AAF90'
        />
        <circle
          cx='83.5'
          cy='200.399'
          r='10.438'
          transform='rotate(-180 83.5 200.399)'
          stroke='#2A5AAF90'
        />
        <circle
          cx='83.5'
          cy='81.412'
          r='10.438'
          transform='rotate(-180 83.5 81.412)'
          stroke='#2A5AAF90'
        />
        <circle
          cx='183.699'
          cy='375.75'
          r='10.438'
          transform='rotate(-180 183.699 375.75)'
          fill='#0a347c90'
          stroke='#2A5AAF90'
        />
        <circle
          cx='183.699'
          cy='563.625'
          r='10.438'
          transform='rotate(-180 183.699 563.625)'
          fill='#0a347c90'
          stroke='#2A5AAF90'
        />
        <circle
          cx='384.1'
          cy='651.3'
          r='10.438'
          transform='rotate(-180 384.1 651.3)'
          fill='rgba(150, 5, 179, 0.05)'
          stroke='#2A5AAF'
        />
        <circle
          cx='484.301'
          cy='574.062'
          r='10.438'
          transform='rotate(-180 484.301 574.062)'
          fill='#520fbd'
          fillOpacity='0.1'
          stroke='#2A5AAF'
          stroke-opacity='1'
          filter='url(#subtleGlow)'
        />
        <circle
          cx='484.301'
          cy='574.062'
          r='10.438'
          transform='rotate(-180 484.301 574.062)'
          fill='#336BCA'
          fillOpacity='.1'
          stroke='#fb64b620'
          filter='url(#subtleGlow)'
        >
          <animate
            attributeName='r'
            values='16;64;16'
            dur='4s'
            repeatCount='indefinite'
          />
          <animate
            attributeName='opacity'
            values='0.4;0.01;0.4'
            dur='4s'
            repeatCount='indefinite'
          />
        </circle>

        <g class='pulse-highlights'>
          <circle
            cx='484.301'
            cy='574.062'
            r='100'
            fill='none'
            stroke='#181a5b'
            stroke-width='1'
            opacity='0'
          >
            <animate
              attributeName='r'
              values='20;120;20'
              dur='20s'
              repeatCount='indefinite'
            />
            <animate
              attributeName='opacity'
              values='0.8;0;0.8'
              dur='20s'
              repeatCount='indefinite'
            />
          </circle>
          <circle
            cx='484.301'
            cy='574.062'
            r='100'
            fill='none'
            stroke='#181a5b'
            stroke-width='1'
            opacity='0'
          >
            <animate
              attributeName='r'
              values='20;120;20'
              dur='14s'
              repeatCount='indefinite'
            />
            <animate
              attributeName='opacity'
              values='0.8;0;0.8'
              dur='14s'
              repeatCount='indefinite'
            />
          </circle>
          <circle
            cx='384'
            cy='257'
            r='80'
            fill='none'
            stroke='#212975'
            stroke-width='1'
            opacity='0'
          >
            <animate
              attributeName='r'
              values='15;90;15'
              dur='15s'
              repeatCount='indefinite'
            />
            <animate
              attributeName='opacity'
              values='0.6;0;0.6'
              dur='15s'
              repeatCount='indefinite'
            />
          </circle>
        </g>

        <g class='pulse-highlights'>
          <circle
            cx='384'
            cy='257'
            r='100'
            fill='none'
            stroke='#181a5b'
            stroke-width='1'
            opacity='0'
          >
            <animate
              attributeName='r'
              values='20;120;20'
              dur='20s'
              repeatCount='indefinite'
            />
            <animate
              attributeName='opacity'
              values='0.8;0;0.8'
              dur='20s'
              repeatCount='indefinite'
            />
          </circle>
          <circle
            cx='384'
            cy='257'
            r='100'
            fill='none'
            stroke='#181a5b'
            stroke-width='1'
            opacity='0'
          >
            <animate
              attributeName='r'
              values='20;120;20'
              dur='14s'
              repeatCount='indefinite'
            />
            <animate
              attributeName='opacity'
              values='0.8;0;0.8'
              dur='14s'
              repeatCount='indefinite'
            />
          </circle>
          <circle
            cx='384'
            cy='257'
            r='80'
            fill='none'
            stroke='#212975'
            stroke-width='1'
            opacity='0'
          >
            <animate
              attributeName='r'
              values='15;90;15'
              dur='15s'
              repeatCount='indefinite'
            />
            <animate
              attributeName='opacity'
              values='0.6;0;0.6'
              dur='15s'
              repeatCount='indefinite'
            />
          </circle>
        </g>
        <circle
          cx='384.1'
          cy='749.412'
          r='10.438'
          transform='rotate(-180 384.1 749.412)'
          fill='#0a347c60'
          stroke='#2A5AAF'
        />
        <circle
          cx='384.1'
          cy='1027.05'
          r='10.438'
          transform='rotate(-180 384.1 1027.05)'
          stroke='#2A5AAF'
        />
        <circle
          cx='283.9'
          cy='924.763'
          r='10.438'
          transform='rotate(-180 283.9 924.763)'
          stroke='#2A5AAF'
          fill='#0fb7bd'
          fill-opacity='0.2'
        />
        <circle
          cx='183.699'
          cy='870.487'
          r='10.438'
          transform='rotate(-180 183.699 870.487)'
          fill-opacity='0.2'
          fill='#520fbd'
          stroke='#2A5AAF'
        />

        <circle
          cx='183.699'
          cy='870.487'
          r='100'
          fill='none'
          stroke='#0f3375'
          stroke-width='1'
          opacity='0'
        >
          <animate
            attributeName='r'
            values='20;120;20'
            dur='8s'
            repeatCount='indefinite'
          />
          <animate
            attributeName='opacity'
            values='0.8;0;0.8'
            dur='4s'
            repeatCount='indefinite'
          />
        </circle>
        <circle
          cx='183.699'
          cy='870.487'
          r='100'
          fill='none'
          stroke='#0f3375'
          stroke-width='1'
          opacity='0'
        >
          <animate
            attributeName='r'
            values='20;120;20'
            dur='14s'
            repeatCount='indefinite'
          />
          <animate
            attributeName='opacity'
            values='0.8;0;0.8'
            dur='14s'
            repeatCount='indefinite'
          />
        </circle>
        <circle
          cx='183.699'
          filter='url(#subtleGlow)'
          cy='870.487'
          r='80'
          fill='none'
          stroke='#720288'
          stroke-width='1'
          opacity='0'
        >
          <animate
            attributeName='r'
            values='15;100;15'
            dur='15s'
            repeatCount='indefinite'
          />
          <animate
            attributeName='opacity'
            values='0.6;0;0.6'
            dur='15s'
            repeatCount='indefinite'
          />
        </circle>
        <circle
          cx='283.9'
          cy='738.975'
          r='10.438'
          transform='rotate(-180 283.9 738.975)'
          fill='#02209a'
          stroke='#2A5AAF90'
        />
        <circle
          cx='83.5'
          cy='695.138'
          r='10.438'
          transform='rotate(-180 83.5 695.138)'
          fill='#02209a'
          stroke='#2A5AAF90'
        />
        <circle
          cx='83.5'
          cy='484.3'
          r='10.438'
          transform='rotate(-180 83.5 484.3)'
          fillOpacity='.42'
          fill='#02209a'
          stroke='#2A5AAF90'
        />
        <circle
          cx='484.301'
          cy='432.112'
          r='10.438'
          transform='rotate(-180 484.301 432.112)'
          fill='#02209a'
          stroke='#2A5AAF90'
        />
        <circle
          cx='584.5'
          cy='432.112'
          r='10.438'
          transform='rotate(-180 584.5 432.112)'
          fill='#02209a'
          stroke='#2A5AAF'
          opacity={90}
        />
        <circle
          cx='584.5'
          cy='642.95'
          r='10.438'
          transform='rotate(-180 584.5 642.95)'
          fill='#02209a'
          stroke='#2A5AAF'
        />
        <circle
          cx='484.301'
          cy='851.699'
          r='10.438'
          transform='rotate(-180 484.301 851.699)'
          stroke='#2A5AAF'
        />
        <circle
          cx='384.1'
          cy='256.763'
          r='10.438'
          transform='rotate(-180 384.1 256.763)'
          stroke='#2A5AAF'
        />
      </g>
    </svg>
  )
}
