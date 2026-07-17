// src/App.tsx
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
          <ActiveListProvider>{authenticatedRoutes}</ActiveListProvider>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </div>

      {user && <BottomNav />}
    </div>
  );
}
