import { Header } from "@/components/Headers";

export default function SettingsPage() {
  const secondaryNavigation = [
    { name: "Account", href: "#", current: true },
    { name: "Proxies", href: "#", current: false },
    { name: "Plugins", href: "#", current: false },
    { name: "Feature Flags", href: "#", current: false },
  ];

  return (
    <>
      <header className="border-b border-mirage-600/90 from-mirage-600/20 to-mirage-600/20 bg-gradient-to-l from-10%  ">
        {/* Secondary navigation */}
        <nav className="flex overflow-x-auto py-4">
          <ul className="flex min-w-full flex-none gap-x-6 px-4 text-sm font-semibold leading-6 text-gray-400 sm:px-6 lg:px-8">
            {secondaryNavigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`font-display ${item.current ? 'text-primary-300' : 'text-slate-400/30 hover:text-slate-400/50'}`}
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Header title="Account Settings" header="Your Account Details" />
      <div className="flex flex-col sm:px-2 lg:px-6 my-2 relative mx-auto w-full justify-center">
        <p className="text-slate-300/95">
          Take control of the OSINTBuddy app theme, your account information,<br /> and permissions for any shared workspaces or graphs.
        </p>
      </div>
      {/* <InquiryHeader title="" header="Proxy configuration" />
      <div className="flex flex-col sm:px-2 lg:px-6 my-2 relative mx-auto w-full justify-center">
        <p className="text-slate-400">
          Adding proxies increases this tools reliability and speed
        </p>
      </div> */}
      <div className="sm:px-2 lg:px-6 my-6 relative mx-auto w-full justify-center">
        <div>
          <div className="flex justify-between">
            {/* <div className="flex flex-col">
              <h2 className="text-base font-semibold leading-7 text-slate-200">
                Your proxies
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Connect proxies to OSINTBuddy one by one or by uploading a txt
                file of proxies. Each new line in the text file is expected to
                be one proxy
              </p>
            </div>
            <button className="rounded-full bg-info-200 px-6 text-sm font-medium text-white hover:bg-info-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400">
              Upload proxies
            </button>
          </div>
          <ul className="mt-6 divide-y divide-light-100 border-t border-dark-300 text-sm leading-6">
            <li className="flex justify-between gap-x-6 py-6">
              <div className="font-medium text-slate-400">
                https://149.143.12.124:4000
              </div>
              <button
                type="button"
                className="font-semibold text-info-200 hover:text-info-100"
              >
                Delete
              </button>
            </li>
          </ul>

          <div className="flex border-t border-dark-300 pt-6">
            <button
              type="button"
              className="text-sm font-semibold leading-6 text-info-200 hover:text-info-100"
            >
              <span aria-hidden="true">+</span> Add another proxy
            </button> */}
          </div>
        </div>
      </div>
    </>
  );
}
