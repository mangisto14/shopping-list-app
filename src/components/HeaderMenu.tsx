// src/components/HeaderMenu.tsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../LanguageContext';
import { appLabels } from '../i18n/app';
import { supabase } from '../supabase/client';

export default function HeaderMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const t = appLabels[language];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: t.title },
    // בעתיד תוכל להוסיף עוד:
    { to: '/categories', label: t.categories_title },
    { to: '/history', label: t.history_title },
  ];

  return (
    <header className="flex w-full max-w-md items-center justify-between bg-blue-600 text-white p-3 -rounded mb-4 rtl:flex-row-reverse">
      <div className="text-xl font-bold">{t.title}</div>

      <div className="md:hidden">
        <button onClick={() => setOpen(!open)}>
          ☰
        </button>
      </div>

      <nav className="hidden md:flex gap-4">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`hover:underline ${location.pathname === item.to ? 'font-bold underline' : ''}`}
          >
            {item.label}
          </Link>
        ))}
        {user && (
          <button onClick={handleLogout} className="hover:underline">
            {t.logout || 'התנתק'}
          </button>
        )}
      </nav>

      {open && (
        <div className="absolute top-16 right-4 bg-white text-black rounded shadow-lg w-40 p-2 z-50 md:hidden rtl:right-auto rtl:left-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`block py-1 px-2 rounded hover:bg-gray-100 ${location.pathname === item.to ? 'font-bold' : ''}`}
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <button
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="block w-full text-left py-1 px-2 rounded hover:bg-gray-100"
            >
              {t.logout || 'התנתק'}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
