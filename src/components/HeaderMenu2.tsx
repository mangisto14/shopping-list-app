import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ArrowRightStartOnRectangleIcon, ChevronDownIcon, PhoneIcon, PlayCircleIcon } from '@heroicons/react/20/solid'
import {
  ShoppingCartIcon,
  RectangleGroupIcon,
  ArchiveBoxIcon,
  Bars2Icon,
} from '@heroicons/react/24/outline'
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../LanguageContext';
import { appLabels } from '../i18n/app';
import { supabase } from '../supabase/client';

export default function HeaderMenu() {
    
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = appLabels[language];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const callsToAction = [
    { name: t.logout, href: '/login', icon: ArrowRightStartOnRectangleIcon },
]
  const solutions = [
  { name: t.title, href: '/', icon: ShoppingCartIcon },
  { name: t.categories_title, href: '/categories', icon: RectangleGroupIcon },
  { name: t.history_title, href: '/history', icon: ArchiveBoxIcon },

]
  return (
    <Popover className="relative">
      <PopoverButton className="inline-flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900">
        <Bars2Icon className="size-8 text-gray-600 group-hover:text-indigo-600"/>
      </PopoverButton>

      <PopoverPanel
        transition
        className="absolute  z-10 mt-5 flex w-screen max-w-max px-4 transition data-[closed]:translate-y-1 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150 data-[enter]:ease-out data-[leave]:ease-in"
      >
        <div className="xl:w-screen max-w-md flex-auto overflow-hidden rounded-3xl bg-white text-sm/6 shadow-lg ring-1 ring-gray-900/5">
          <div className="px-4 py-2">
            {solutions.map((item) => (
              <div key={item.name} className="group relative flex gap-x-6 rounded-lg py-2 hover:bg-gray-50">
                <div className="mt-1 flex flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                    <Link
                        key={item.href}
                        to={item.href}
                        className={`w-full max-w-md p-2 flex justify-between hover:underline ${location.pathname === item.href ? 'font-bold underline' : ''}`}>
                        <item.icon aria-hidden="true" className="size-6 text-gray-600 group-hover:text-indigo-600" />
                        <span className="mr-2 text-gray-900 group-hover:text-indigo-600">
                        {item.name}
                        </span>
                    </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 px-4 py-2 divide-x divide-gray-900/5 bg-gray-50">
            {user && (
                callsToAction.map((item) => (
              <a
                key={item.name}
                href='#'
                onClick={handleLogout}
                className="flex items-center justify-center gap-x-2.5 p-3 font-semibold text-gray-900 hover:bg-gray-100">
                <item.icon aria-hidden="true" className="size-5 flex-none text-gray-400" />
                {item.name}
              </a>
            ))

        )}
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  )
}
