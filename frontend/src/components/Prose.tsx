
export default function Prose({ className, ...props }: any) {
  return (
    <div
      className={`
      ${className}
        prose prose-slate max-w-none prose-code:text-pink-400 not-prose-pre:prose-code:bg-slate-900 prose-pre:prose-code:text-teal-400 rounded prose-code:px-0.5 prose-code:py-px prose-code:rounded prose-pre:text-inherit  prose-ul:text-slate-400 prose-ol:text-slate-400 prose-p:text-slate-400 prose-headings:text-slate-350
        prose-headings:scroll-mt-22 prose-heading:mt-2 prose-headings:mb-2 prose-headings:font-display prose-headings:font-normal lg:prose-headings:scroll-mt-[8.5rem]
        prose-lead:text-slate-400 dark:prose-lead:text-slate-350
        prose-a:font-semibold dark:prose-a:text-primary-340
        prose-a:no-underline prose-strong:text-slate-350 peer:hover:prose-a:text-primary-200 prose-strong:font-bold prose-a:text-primary-300 prose-a:hover:text-primary-200 hover:prose-a: dark:[--tw-prose-background:theme(colors.slate.900)] 
        prose-pre:rounded-xl prose-pre:prose-code:bg-black/10 prose-pre:shadow-lg dark:prose-pre:bg-black/40 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-mirage-600
        dark:prose-hr:border-mirage-700 prose-th:text-slate-350 prose-th:font-display prose-th:border-b-2 prose-th:border-mirage-100 prose-tr:text-slate-350
      `}
      {...props}
    />
  )
}
