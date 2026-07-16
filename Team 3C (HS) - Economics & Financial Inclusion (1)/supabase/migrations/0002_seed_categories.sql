-- Seed default system categories (user_id null = visible to every user).
-- icon = a lucide-react icon name consumed by src/lib/categories.ts.
-- swatch = a brand-derived swatch slug consumed by src/lib/categories.ts
-- (there are only 3 real hues in this app's brand — sage/gold/rose — so
-- swatch values cycle through those plus muted, not new colors).

insert into categories (user_id, slug, name, icon, swatch, is_system, sort_order) values
  (null, 'housing',       'Housing',         'Home',           'sage',      true, 1),
  (null, 'food',          'Food & Dining',   'Utensils',       'gold',      true, 2),
  (null, 'transport',     'Transportation',  'Bus',            'sage-soft', true, 3),
  (null, 'shopping',      'Shopping',        'ShoppingBag',    'gold-soft', true, 4),
  (null, 'entertainment', 'Entertainment',   'Film',           'rose',      true, 5),
  (null, 'health',        'Health',          'HeartPulse',     'sage',      true, 6),
  (null, 'subscriptions', 'Subscriptions',   'Repeat',         'gold',      true, 7),
  (null, 'income',        'Income',          'TrendingUp',     'sage-soft', true, 8),
  (null, 'transfer',      'Transfer',        'ArrowLeftRight', 'muted',     true, 9),
  (null, 'other',         'Other',           'MoreHorizontal', 'muted',     true, 10)
on conflict (slug) where user_id is null do nothing;
