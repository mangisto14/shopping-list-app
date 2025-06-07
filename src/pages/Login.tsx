import { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { loginLabels } from '../i18n/login';

export default function Login() {
  const { language } = useLanguage();
  const t = loginLabels[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) navigate('/');
    else setErrorMsg(error.message);
  };

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-4 text-left">
      <form onSubmit={handleLogin} className="space-y-4">
        <h2 className="text-xl font-semibold">{t.login}</h2>

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

        {errorMsg && (
          <p className="text-red-500 text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {t.submit}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        {t.noAccount}{' '}
        <Link to="/register" className="text-blue-600 hover:underline">
          {t.register}
        </Link>
      </p>
    </div>
  );
}