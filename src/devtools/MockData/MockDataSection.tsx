// src/devtools/MockData/MockDataSection.tsx
// Deliberately additive-only - see the "Remove for now" note in
// src/devtools/index.ts about why Database Utilities (destructive
// operations: reset/archive/seed-as-admin-action) was dropped instead
// of migrated. Every action here only ever inserts rows the signed-in
// user already owns; nothing here can touch another user's data or
// delete anything.
import { useState } from 'react';
import { Section, ActionButton } from '../shared/controls';
import { useAuth } from '../../hooks/useAuth';
import { useActiveList } from '../../ActiveListContext';
import { supabase } from '../../supabase/client';

const DEFAULT_CATEGORY_NAMES = ['מוצרי חלב', 'ירקות', 'פירות', 'מאפים', 'בשר ודגים', 'משקאות', 'קפואים', 'ניקיון', 'אחר'];
const DEMO_ITEM_NAMES = ['חלב 3%', 'לחם', 'ביצים', 'עגבניות'];

export default function MockDataSection({
  expanded, onToggle, visible,
}: {
  expanded: boolean; onToggle: () => void; visible: boolean;
}) {
  const { user } = useAuth();
  const { activeListId, refetchLists } = useActiveList();
  const [status, setStatus] = useState<string | null>(null);

  const run = async (action: () => Promise<string>) => {
    setStatus('Running…');
    try {
      setStatus(await action());
      await refetchLists();
    } catch (err) {
      setStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const seedCategories = async (listId: string) => {
    const { data: existing } = await supabase.from('categories').select('name').eq('list_id', listId);
    const existingNames = new Set((existing ?? []).map((c) => c.name));
    const missing = DEFAULT_CATEGORY_NAMES.filter((n) => !existingNames.has(n));
    if (missing.length > 0 && user) {
      await supabase.from('categories').insert(missing.map((name) => ({ list_id: listId, user_id: user.id, name })));
    }
    return missing.length;
  };

  const createDemoShoppingList = () => run(async () => {
    if (!user) return 'Not signed in.';
    const name = `Demo List ${new Date().toLocaleString()}`;
    const { data: list, error } = await supabase.from('lists').insert({ name, owner_id: user.id }).select().single();
    if (error || !list) throw error ?? new Error('insert returned no row');
    const { error: memberError } = await supabase.from('list_members').insert({ list_id: list.id, user_id: user.id });
    if (memberError) throw memberError;
    return `Created "${name}".`;
  });

  const createDemoCategories = () => run(async () => {
    if (!activeListId) return 'No active list selected.';
    const added = await seedCategories(activeListId);
    return added === 0 ? 'Active list already has every default category.' : `Added ${added} categor${added === 1 ? 'y' : 'ies'} to the active list.`;
  });

  // Client-side code has no way to create other real user accounts
  // (that needs the Supabase service-role key, which never ships to
  // the browser) - "family" here means a fully-populated demo list
  // standing in for one, not actual additional member accounts.
  const createDemoFamily = () => run(async () => {
    if (!user) return 'Not signed in.';
    const name = `Demo Family List ${new Date().toLocaleString()}`;
    const { data: list, error } = await supabase.from('lists').insert({ name, owner_id: user.id }).select().single();
    if (error || !list) throw error ?? new Error('insert returned no row');
    await supabase.from('list_members').insert({ list_id: list.id, user_id: user.id });
    await seedCategories(list.id);
    const { data: categories } = await supabase.from('categories').select('id, name').eq('list_id', list.id);
    const firstCategoryId = categories?.[0]?.id ?? null;
    await supabase.from('items').insert(
      DEMO_ITEM_NAMES.map((itemName, i) => ({
        list_id: list.id, user_id: user.id, category_id: firstCategoryId, name: itemName, position: i,
      }))
    );
    return `Created "${name}" with categories and ${DEMO_ITEM_NAMES.length} items. (Real family members still need a real invite - see the Family screen.)`;
  });

  return (
    <Section title="Mock Data" expanded={expanded} onToggle={onToggle} visible={visible}>
      <div className="px-4 py-3 space-y-2">
        <ActionButton label="Create Demo Shopping List" onClick={createDemoShoppingList} />
        <ActionButton label="Create Demo Categories" onClick={createDemoCategories} />
        <ActionButton label="Create Demo Family" onClick={createDemoFamily} />
        {status && <p className="text-xs text-gray-500 pt-1">{status}</p>}
      </div>
    </Section>
  );
}
