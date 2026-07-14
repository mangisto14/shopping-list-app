// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  const { language, setLanguage } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center mt-10">טוען...</div>;

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

return (
  <BrowserRouter>
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-md p-4 flex justify-between">
        {user && <HeaderMenu />}

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
      </div>

      <div className={`w-full max-w-md p-4 ${user ? 'pb-28' : ''}`}>
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
  </BrowserRouter>
);

}

