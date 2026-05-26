create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  educator_user_id uuid not null references users(id) on delete cascade,
  created_by_user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null check (status in ('draft', 'live', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists ledger_transactions (
  id uuid primary key,
  reference text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references ledger_transactions(id) on delete cascade,
  account_code text not null,
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('USD')),
  campaign_id uuid references campaigns(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_campaign_idx on ledger_entries (campaign_id);
