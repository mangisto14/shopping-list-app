// src/pages/Register.tsx
import { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { loginLabels } from '../i18n/login';

export default function Register() {
  const { language } = useLanguage();
  const t = loginLabels[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) navigate('/');
    else setErrorMsg(error.message);
  };

  return (
    <form onSubmit={handleRegister} className="max-w-sm mx-auto mt-12 space-y-4 text-left">
      <h2 className="text-xl font-semibold">{t.register || 'Register'}</h2>

      <input
        type="email"
        placeholder={t.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder={t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
      >
        {t.submit || 'Register'}
      </button>
    </form>
  );
}
