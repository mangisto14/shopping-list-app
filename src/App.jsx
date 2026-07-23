// src/App.tsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ShoppingList from './pages/ShoppingList';
import CategoriesPage from './pages/Categories';
import HistoryPage from './pages/History';
import ListsPage from './pages/Lists';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import FamilyMembers from './pages/FamilyMembers';

import { isDevToolsEnabled, DeveloperConsolePage, DevToolsOverlay, useDevTools } from './devtools';
import { useAuth } from './hooks/useAuth';
import { useLanguage } from './LanguageContext';
import { ActiveListProvider } from './ActiveListContext';
import HeaderMenu from './components/HeaderMenu2';
import BottomNav from './components/navigation/BottomNav';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

// Fades route content in on every path change - Developer Console's
// Animations > Page Transition setting. A plain opacity fade, not a
// routing library: this app's own <Routes> already own mount/unmount,
// this only wraps the result.
// No prop-types package in this project; no other component declares them either.
// eslint-disable-next-line react/prop-types
function PageFade({ children }) {
  const { animations } = useDevTools();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: `opacity ${animations.pageTransitionDuration}ms ease-out` }}>
      {children}
    </div>
  );
}

// Split out from App() so useLocation() has Router context to read -
// App() itself is what renders the BrowserRouter, so it can't call
// router hooks at its own top level.
function AppShell() {
  const { language, setLanguage } = useLanguage();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="text-center mt-10" role="status" aria-live="polite">טוען...</div>;

  const authenticatedRoutes = (
    <Routes>
      <Route path="/" element={<ShoppingList />} />
      <Route path="/home" element={<Dashboard />} />
      <Route path="/statistics" element={<Statistics />} />
      <Route path="/family" element={<FamilyMembers />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/lists" element={<ListsPage />} />
      <Route path="/history" element={<HistoryPage />} />
      {isDevToolsEnabled() && <Route path="/dev-settings" element={<DeveloperConsolePage />} />}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );

  // The Shopping List tab manages its own full-height layout and bottom-
  // nav clearance internally (see ShoppingList.tsx - only its item list
  // scrolls, everything else is pinned). The generic `pb-28` every other
  // page relies on for normal page-scroll would just add unwanted extra
  // height below that page's own precise `calc(100dvh - ...)` sizing.
  const isShoppingListRoute = Boolean(user) && location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-md h-12 px-4 flex justify-between items-center flex-shrink-0">
        {user && <HeaderMenu />}

        <div className="flex justify-end">
          <label htmlFor="language-select" className="sr-only">
            Language / שפה
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border rounded p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div
        className={`w-full max-w-md px-4 ${user ? (isShoppingListRoute ? '' : 'pb-28') : 'py-4'}`}
      >
        {user ? (
          <ActiveListProvider>
            <PageFade>{authenticatedRoutes}</PageFade>
          </ActiveListProvider>
        ) : (
          <PageFade>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </PageFade>
        )}
      </div>

      {user && <BottomNav />}
      {isDevToolsEnabled() && <DevToolsOverlay />}
    </div>
  );
}
