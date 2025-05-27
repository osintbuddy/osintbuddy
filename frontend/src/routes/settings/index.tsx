import { Header } from "@/components/Headers";

const secondaryNavigation = [
  { name: "Account", href: "#", current: true },
  { name: "Plugins", href: "#", current: false },
];

export default function SettingsPage() {


  return (
    <>
      <header class="border-b from-cod-800/50 to-cod-800/40 bg-gradient-to-br shadow-xl border-mirage-700/20 from-10% z-10">
        <nav class="flex overflow-x-auto py-4">
          <ul class="flex min-w-full flex-none gap-x-6 px-4 text-sm font-semibold leading-6 text-gray-400 sm:px-6 lg:px-8">
            {secondaryNavigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  class={`font-display ${item.current ? 'text-primary-300' : 'text-slate-400/30 hover:text-slate-400/50'}`}
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Header title="Account Settings" header="Your Account Details" />
      <div class="flex flex-col sm:px-2 lg:px-6 my-2 relative mx-auto w-full justify-center">
        <p class="text-slate-300/95">
          Take control of the OSINTBuddy app theme, your account information,<br /> and permissions for any shared workspaces or graphs.
        </p>
      </div>
    </>
  );
}
