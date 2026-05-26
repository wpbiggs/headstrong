create table if not exists mastery_signals (
  skill_id uuid not null,
  learner_id uuid not null references users(id) on delete cascade,
  score real not null check (score >= 0 and score <= 1),
  evidence_count integer not null check (evidence_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (skill_id, learner_id)
);

create table if not exists lms_sync_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('moodle', 'erpnext', 'gibbon')),
  quest_id uuid references quests(id) on delete cascade,
  learner_id uuid references users(id) on delete cascade,
  assignment_external_id text,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lms_sync_events_provider_idx on lms_sync_events (provider, created_at desc);
