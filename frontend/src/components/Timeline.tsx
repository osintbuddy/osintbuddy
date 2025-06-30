import { JSX } from "preact/jsx-runtime"
import { Icon } from "./Icons"
import Button from "./buttons"
import { CodeBracketIcon } from "@heroicons/react/24/outline"

export function Timelines({ children }: { children: JSX.Element | JSX.Element[] | undefined }) {
    return (
        <ol class="relative border-l border-gray-200 dark:border-mirage-300">
            {children}
        </ol>
    )
}

export interface TimelineProps {
    title: string
    releaseDate: string
    description: string
    downloadLink: string
}

export function Timeline({ title, releaseDate, description, downloadLink }: TimelineProps) {
    return (
        <li class="ml-6">
            <span class="absolute flex items-center justify-center w-8 h-8 rounded-full -left-3 ring-8 ring-mirage-800/30 from-primary-350  to-primary-200 bg-radial-[at_10%_65%] from-65%">
                <Icon icon="calendar-week" className="w-4 h-4" />
            </span>
            <h3 class="flex items-center mb-1 text-xl font-semibold text-gray-900 dark:text-slate-300"> {title}
                {downloadLink && <span class="text-sm font-medium mr-2 px-2.5 py-0.5 rounded bg-primary-350 text-radiance-50 ml-3">Latest</span>}
            </h3>
            <time class="block mb-2 text-sm font-normal leading-none text-slate-400">{releaseDate}</time>
            <p class="mb-4 text-base font-normal text-slate-600 dark:text-slate-400">{description}</p>
            {downloadLink && (
                <Button.Ghost variant="primary" className='max-w-xs min-w-min !my-4'>
                    <a href={downloadLink} className="!text-inherit !font-display !text-sm">Download Source Code</a>
                    <CodeBracketIcon className="btn-icon" />
                </Button.Ghost>
            )}
        </li>
    )
}