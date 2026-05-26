alter table compute_jobs
add column if not exists retry_count integer not null default 0;

alter table compute_jobs
add column if not exists last_error text;

alter table compute_jobs
drop constraint if exists compute_jobs_status_check;

alter table compute_jobs
add constraint compute_jobs_status_check
check (status in ('queued', 'running', 'succeeded', 'failed'));

create table if not exists compute_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references compute_jobs(id) on delete cascade,
  type text not null check (type in ('queued', 'started', 'succeeded', 'failed', 'retry_scheduled')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists compute_job_results (
  job_id uuid primary key references compute_jobs(id) on delete cascade,
  output text not null,
  score real not null check (score >= 0 and score <= 1),
  valid boolean not null,
  penalty_applied boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists provider_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references compute_jobs(id) on delete cascade,
  provider_id text not null,
  validator_id text not null,
  duration_ms integer not null check (duration_ms >= 0),
  attempt integer not null check (attempt >= 1),
  created_at timestamptz not null default now()
);

create index if not exists compute_job_events_job_idx on compute_job_events (job_id, created_at asc);
create index if not exists provider_runs_job_idx on provider_runs (job_id, created_at desc);
