create table if not exists compute_jobs (
  id uuid primary key default gen_random_uuid(),
  version text not null check (version in ('v1')),
  type text not null check (type in ('inference', 'scoring')),
  status text not null check (status in ('queued', 'running', 'validated', 'failed')),
  payload jsonb not null,
  provider_id text not null,
  validator_id text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compute_jobs_status_idx on compute_jobs (status, created_at desc);
