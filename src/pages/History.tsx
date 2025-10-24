// src/pages/HistoryPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    setHistory(data || []);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">היסטוריית קניות</h2>

      {history.length === 0 ? (
        <p className="text-gray-500 text-center">אין רשימות קודמות</p>
      ) : (
        <ul className="space-y-4">
          {history.map((entry) => (
            <li key={entry.id} className="bg-gray-100 p-4 rounded shadow">
              <p className="text-sm text-gray-600 mb-2">
                {new Date(entry.created_at).toLocaleString()}
              </p>
              <ul className="list-disc list-inside">
                {entry.items.map((item: any) => (
                  <li key={item.id} className={item.is_done ? 'line-through text-gray-500' : ''}>
                    {item.name}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
