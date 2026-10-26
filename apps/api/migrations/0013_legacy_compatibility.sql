alter table quest_events drop constraint if exists quest_events_type_check;
alter table quest_events add constraint quest_events_type_check check (
  type in ('draft_created', 'submitted_for_approval', 'parent_approved',
    'educator_intervened', 'educator_reviewed', 'completed', 'rejected', 'deleted')
);

alter table compute_jobs add column if not exists next_attempt_at timestamptz;

-- Recover JSONB strings written by the old double-serialization pattern.
update quests set moderation = (moderation #>> '{}')::jsonb
where jsonb_typeof(moderation) = 'string';
update quest_tasks set scene_plan = (scene_plan #>> '{}')::jsonb
where jsonb_typeof(scene_plan) = 'string';
update quest_events set metadata = (metadata #>> '{}')::jsonb
where jsonb_typeof(metadata) = 'string';
update audit_events set payload = (payload #>> '{}')::jsonb
where jsonb_typeof(payload) = 'string';
