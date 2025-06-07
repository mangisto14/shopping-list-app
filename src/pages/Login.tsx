import { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { loginLabels } from '../i18n/login';

export default function Login() {
  const { language } = useLanguage();
  const t = loginLabels[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) navigate('/');
    else alert(error.message);
  };

  return (
    <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-12 space-y-4">
      <h2 className="text-xl font-semibold">{t.login}</h2>
      <input
        type="email"
        placeholder={t.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
      />
      <input
        type="password"
        placeholder={t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
      />
      <button type="submit" className="btn">
        {t.submit}
      </button>
    </form>
  );
}
