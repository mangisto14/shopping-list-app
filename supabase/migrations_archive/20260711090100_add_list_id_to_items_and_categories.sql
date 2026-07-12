-- Phase 1B: add `list_id` to `items` and `categories`.
-- Additive and non-breaking: nullable for now, `user_id` is untouched and
-- remains the column the current application reads/writes. No existing
-- policies on these two tables are modified or removed.

alter table public.items
  add column if not exists list_id uuid references public.lists(id) on delete cascade;

alter table public.categories
  add column if not exists list_id uuid references public.lists(id) on delete cascade;

create index if not exists idx_items_list_id on public.items(list_id);
create index if not exists idx_categories_list_id on public.categories(list_id);
