create table if not exists curriculum_assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  subject text not null,
  grade_band text not null,
  license text not null,
  source_url text not null,
  tags jsonb not null default '[]'::jsonb,
  contributor_user_id uuid not null references users(id) on delete cascade,
  contribution_type text not null check (contribution_type in ('original', 'remix', 'translation', 'adaptation')),
  status text not null check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists curriculum_asset_edges (
  id uuid primary key default gen_random_uuid(),
  parent_asset_id uuid not null references curriculum_assets(id) on delete cascade,
  child_asset_id uuid not null references curriculum_assets(id) on delete cascade,
  relation text not null check (relation in ('remixed_from', 'translated_from', 'adapted_from')),
  created_at timestamptz not null default now(),
  unique (parent_asset_id, child_asset_id, relation)
);

create table if not exists curriculum_asset_impacts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references curriculum_assets(id) on delete cascade,
  learner_id uuid references users(id) on delete set null,
  quest_id uuid references quests(id) on delete set null,
  signal text not null check (signal in ('view', 'reuse', 'completion')),
  weight real not null check (weight > 0 and weight <= 10),
  created_at timestamptz not null default now()
);

create index if not exists curriculum_assets_subject_idx on curriculum_assets (subject, created_at desc);
create index if not exists curriculum_assets_contributor_idx on curriculum_assets (contributor_user_id);
create index if not exists curriculum_asset_impacts_asset_idx on curriculum_asset_impacts (asset_id, created_at desc);
