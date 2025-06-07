// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ShoppingList from './pages/ShoppingList';
import { useAuth } from './hooks/useAuth';
import { useLanguage } from './LanguageContext';

export default function App() {
  const { language, setLanguage } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center mt-10">טוען...</div>;

  return (
    <BrowserRouter>
      <div className="max-w-md mx-auto p-4">
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
    </BrowserRouter>
  );
}
