create table auth_sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index auth_sessions_user_idx on auth_sessions (user_id);
