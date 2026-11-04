-- Distinguish retry-safe discovery submissions from legacy learning goals.
alter table learning_goals add column discovery_submission boolean not null default false;
create index learning_goals_learner_created_idx
  on learning_goals (learner_id, created_at desc, id desc);
