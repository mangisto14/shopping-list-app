// src/pages/HistoryPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import HistorySessionCard from '../components/history/HistorySessionCard';

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    setHistory(data || []);
    setLoading(false);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-28 space-y-4">
      <div className="flex flex-col gap-0.5 px-1">
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">היסטוריה</h1>
        {history.length > 0 && (
          <p className="text-[13px] font-medium text-gray-500">{history.length} קניות</p>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState icon="🧾" title="אין היסטוריית קניות עדיין" description="רשימות שתשלים/י יופיעו כאן" size="lg" />
      ) : (
        <div className="relative">
          <div className="absolute top-2.5 bottom-0 right-[33px] w-0.5 bg-gray-200" aria-hidden="true" />
          <div className="flex flex-col gap-3.5 relative">
            {history.map((entry) => (
              <HistorySessionCard
                key={entry.id}
                date={new Date(entry.created_at).toLocaleString('he-IL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                items={entry.items ?? []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
