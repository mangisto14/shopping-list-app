// src/pages/Register.tsx
import { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { registerLabels } from '../i18n/register';

export default function Register() {
  const { language } = useLanguage();
  const t = registerLabels[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) {
      alert(t.success);
      navigate('/login');
    } else {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleRegister} className="max-w-sm mx-auto mt-12 space-y-4">
      <h2 className="text-xl font-semibold">{t.title}</h2>
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
