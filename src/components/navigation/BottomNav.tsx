// src/components/navigation/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { ListBulletIcon, Squares2X2Icon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import {
  ListBulletIcon as ListBulletIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ClockIcon as ClockIconSolid,
} from '@heroicons/react/24/solid';

// Tab set matches the Claude Design source of truth (list / categories /
// family / history) rather than the app's prior tab set (home /
// statistics) - those two pages remain reachable by direct URL, just not
// pinned to the tab bar. See docs/design-mapping.md for the reasoning.
//
// DOM order matters under dir="rtl" (set globally via <html dir="rtl">):
// grid/flex items lay out right-to-left, so the first tab here renders
// as the rightmost tab on screen - matching the design's list-first,
// history-last layout.
const TABS = [
  { to: '/', label: 'רשימה', Icon: ListBulletIcon, ActiveIcon: ListBulletIconSolid, end: true },
  { to: '/categories', label: 'קטגוריות', Icon: Squares2X2Icon, ActiveIcon: Squares2X2IconSolid, end: true },
  { to: '/family', label: 'משפחה', Icon: UserGroupIcon, ActiveIcon: UserGroupIconSolid, end: true },
  { to: '/history', label: 'היסטוריה', Icon: ClockIcon, ActiveIcon: ClockIconSolid, end: true },
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
      aria-label="ניווט ראשי"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed bottom-0 inset-x-0 z-40 bg-white/92 backdrop-blur-md border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto grid grid-cols-4 h-16">
        {TABS.map(({ to, label, Icon, ActiveIcon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${
                isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => {
              const TabIcon = isActive ? ActiveIcon : Icon;
              return (
                <>
                  <TabIcon className="w-[22px] h-[22px]" aria-hidden="true" />
                  <span aria-current={isActive ? 'page' : undefined}>{label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
