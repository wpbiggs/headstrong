create table if not exists guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  slug text not null unique,
  created_by_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists discovery_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references users(id) on delete cascade,
  author_role text not null check (
    author_role in ('student', 'parent', 'educator', 'expert', 'admin')
  ),
  guild_id uuid references guilds(id) on delete set null,
  title text not null,
  body text not null,
  tags jsonb not null default '[]'::jsonb,
  visibility text not null check (visibility in ('internal')),
  state text not null check (state in ('draft', 'pending_parent_approval', 'live', 'rejected', 'removed')),
  moderation_state text not null check (moderation_state in ('pass', 'warn', 'block', 'reported')),
  moderation jsonb not null,
  requires_parent_approval boolean not null default false,
  parent_approved_at timestamptz,
  parent_rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists discovery_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references discovery_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  reaction_type text not null check (
    reaction_type in ('curious', 'inspired', 'celebrate')
  ),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction_type)
);

create table if not exists discovery_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references discovery_posts(id) on delete cascade,
  reported_by_user_id uuid not null references users(id) on delete cascade,
  reason text not null check (reason in ('safety', 'bullying', 'spam', 'other')),
  details text,
  created_at timestamptz not null default now()
);

create table if not exists guild_memberships (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references guilds(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('approved', 'pending')),
  created_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

create index if not exists discovery_posts_created_idx on discovery_posts (created_at desc, id desc);
create index if not exists discovery_posts_state_idx on discovery_posts (state);
create index if not exists discovery_reactions_post_idx on discovery_reactions (post_id);
create index if not exists discovery_reports_post_idx on discovery_reports (post_id);
create index if not exists guild_memberships_guild_idx on guild_memberships (guild_id);
