
export default function Prose({ className, ...props }: any) {
  return (
    <div
      className={`
      ${className}
        prose prose-em:text-slate-350/95 prose-slate max-w-none prose-code:text-pink-400 not-prose-pre:prose-code:bg-slate-900 prose-pre:prose-code:text-teal-400 rounded prose-code:px-0.5 prose-code:py-px prose-code:rounded prose-pre:text-inherit  prose-ul:text-slate-350 prose-ol:text-slate-350 prose-p:pb-1 prose-p:text-slate-350 prose-headings:text-slate-350
        prose-headings:mt-6 prose-p:my-2 prose-heading:my-2 prose-headings:mb-2 prose-headings:font-display prose-headings:font-normal 
        prose-lead:text-slate-350
        prose-a:font-medium 
        prose-a:no-underline prose-strong:text-slate-350 peer:hover:prose-a:text-primary-200 prose-strong:font-bold prose-a:text-primary-50 prose-a:hover:text-primary-100/95  
        prose-pre:rounded-xl prose-pre:prose-code:bg-black/10 prose-pre:shadow-lg prose-pre:bg-black/40 dark:prose-pre:ring-1 prose-pre:ring-mirage-600
        prose-hr:border-slate-800 prose-th:text-slate-350 prose-th:font-display prose-th:border-b-2 prose-th:border-mirage-100 prose-tr:text-slate-350
      `}
      {...props}
    />
  )
}
