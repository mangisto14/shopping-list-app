// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ShoppingList from './pages/ShoppingList';
import CategoriesPage from './pages/Categories';
import HistoryPage from './pages/History';

import { useAuth } from './hooks/useAuth';
import { useLanguage } from './LanguageContext';
import HeaderMenu from './components/HeaderMenu';
export default function App() {
  const { language, setLanguage } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center mt-10">טוען...</div>;

return (
  <BrowserRouter>
    <div className="min-h-screen flex flex-col items-center">
      {user && <HeaderMenu />}

      <div className="w-full max-w-md p-4">
        <div className="flex justify-end mb-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border rounded p-1"
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>

        <Routes>
          {user ? (
            <>
              <Route path="/" element={<ShoppingList />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          )}
        </Routes>
      </div>
    </div>
  </BrowserRouter>
);

}

