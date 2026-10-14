begin;

create table if not exists learning_goals (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references users(id),
  objective text not null check (length(objective) between 5 and 500),
  quest_id uuid references quests(id),
  created_at timestamptz not null default now(),
  unique (id, quest_id)
);

-- Each goal has one immutable evidence/assessment/rating in this first slice.
create table if not exists learning_evidence (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null unique,
  quest_id uuid not null,
  task_id uuid not null references quest_tasks(id),
  reflection text not null check (length(reflection) between 10 and 2000),
  observed_entity_ids jsonb not null check (
    jsonb_typeof(observed_entity_ids) = 'array'
    and jsonb_array_length(observed_entity_ids) between 1 and 24
  ),
  created_at timestamptz not null default now(),
  foreign key (goal_id, quest_id) references learning_goals(id, quest_id)
);

create table if not exists learning_feedback (
  goal_id uuid primary key references learning_evidence(goal_id),
  educator_id uuid not null references users(id),
  assessment text not null check (assessment in ('demonstrated', 'needs_practice')),
  comment text not null check (length(comment) between 5 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists learning_satisfaction (
  goal_id uuid primary key references learning_feedback(goal_id),
  enjoyment integer not null check (enjoyment between 1 and 5),
  agency integer not null check (agency between 1 and 5),
  challenge integer not null check (challenge between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists learning_goals_learner_idx on learning_goals (learner_id);
create index if not exists learning_goals_quest_idx on learning_goals (quest_id);

commit;
