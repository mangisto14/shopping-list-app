// src/components/navigation/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { HomeIcon, ShoppingCartIcon, ChartBarIcon, UsersIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UsersIcon as UsersIconSolid,
} from '@heroicons/react/24/solid';

// DOM order matters under dir="rtl" (set globally in LanguageContext):
// grid/flex items lay out right-to-left, so the first tab here renders
// as the rightmost tab on screen - בית first puts it on the right,
// matching the target screenshots (בית rightmost, חברים leftmost).
const TABS = [
  { to: '/home', label: 'בית', Icon: HomeIcon, ActiveIcon: HomeIconSolid, end: true },
  { to: '/', label: 'רשימה', Icon: ShoppingCartIcon, ActiveIcon: ShoppingCartIconSolid, end: true },
  { to: '/statistics', label: 'סטטיסטיקה', Icon: ChartBarIcon, ActiveIcon: ChartBarIconSolid, end: true },
  { to: '/family', label: 'חברים', Icon: UsersIcon, ActiveIcon: UsersIconSolid, end: true },
];

// Fixed, persistent bottom tab bar. Rendered once in App.jsx around the
// authenticated routes - never imported by individual pages. Height is
// a fixed h-16 (4rem) row plus real safe-area-inset-bottom padding for
// iPhone Safari's home indicator; FloatingAddButton's offset is derived
// from this same 4rem figure so the two never overlap (see that file's
// own comment).
export default function BottomNav() {
  return (
    <nav
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto grid grid-cols-4 h-16">
        {TABS.map(({ to, label, Icon, ActiveIcon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors active:scale-95 ${
                isActive ? 'text-violet-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => {
              const TabIcon = isActive ? ActiveIcon : Icon;
              return (
                <>
                  <TabIcon className="size-6" />
                  <span>{label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
