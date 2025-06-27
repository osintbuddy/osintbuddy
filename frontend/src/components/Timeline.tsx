import { Button } from "./Button"

export function Timelines({ children }) {
    return (
        <ol class="relative border-l border-gray-200 dark:border-mirage-300">
            {children}
        </ol>
    )
}

export function Timeline({ title, releaseDate, description, downloadLink }) {
    return (
        <li class="ml-6">
            <span class="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-mirage-800/30 dark:bg-primary-400/60">
                <svg class="w-2.5 h-2.5 text-blue-800 dark:text-slate-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                </svg>
            </span>
            <h3 class="flex items-center mb-1 text-lg font-semibold text-gray-900 dark:text-slate-300"> {title} 
                {downloadLink &&  <span class="bg-blue-100 text-blue-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-primary-400 dark:text-radiance-200 ml-3">Latest</span>}
            </h3>
            <time class="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-slate-400">{releaseDate}</time>
            <p class="mb-4 text-base font-normal text-slate-600 dark:text-slate-400">{description}</p>
            {downloadLink && <Button target="_blank" className='btn-primary max-w-xs min-w-min' href={downloadLink}>
                    Download Git Source
                <svg className='ml-3 w-5 h-5 ' aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            </Button>}
        </li>
    )
}