-- Supportive guardian replies are separate from educator assessment and mastery.
create table learning_guardian_feedback (
  goal_id uuid primary key references learning_evidence(goal_id),
  guardian_id uuid not null references users(id),
  comment text not null check (length(btrim(comment)) between 5 and 2000),
  created_at timestamptz not null default now()
);

create index learning_guardian_feedback_guardian_idx
  on learning_guardian_feedback (guardian_id);

alter table learning_guardian_feedback enable row level security;
revoke all on learning_guardian_feedback from public;
