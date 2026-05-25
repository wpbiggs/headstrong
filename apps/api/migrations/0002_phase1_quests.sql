create table if not exists parent_student_links (
  parent_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

create table if not exists quests (
  id uuid primary key,
  student_id uuid not null references users(id),
  name text not null,
  summary text not null,
  current_state text not null check (
    current_state in ('draft', 'awaiting_approval', 'live', 'completed', 'rejected', 'deleted')
  ),
  parent_id uuid not null references users(id),
  educator_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quest_events (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  type text not null check (
    type in (
      'draft_created',
      'submitted_for_approval',
      'parent_approved',
      'educator_intervened',
      'completed',
      'rejected',
      'deleted'
    )
  ),
  performed_by_user_id uuid not null references users(id),
  performed_by_role text not null check (
    performed_by_role in ('student', 'parent', 'educator', 'expert', 'admin')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists quest_tasks (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('lesson', 'exercise', 'scene')),
  summary text not null,
  content_ref text not null,
  position integer not null,
  estimated_minutes integer not null check (estimated_minutes > 0),
  created_at timestamptz not null default now()
);

create index if not exists quests_student_id_idx on quests (student_id);
create index if not exists quests_parent_id_idx on quests (parent_id);
create index if not exists quest_events_quest_id_idx on quest_events (quest_id, created_at);
create index if not exists quest_tasks_quest_id_idx on quest_tasks (quest_id, position);
