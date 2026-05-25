alter table quests
add column if not exists needs_educator_review boolean;

update quests
set needs_educator_review = coalesce((moderation ->> 'verdict') = 'warn', false)
where needs_educator_review is null;

alter table quests
alter column needs_educator_review set not null;

alter table quest_tasks
add column if not exists template_id text;

alter table quest_tasks
add column if not exists scene_plan jsonb;

update quest_tasks
set template_id = coalesce(template_id, 'legacy-task-template')
where template_id is null;

update quest_tasks
set scene_plan = coalesce(
  scene_plan,
  jsonb_build_object(
    'id', id::text,
    'templateId', template_id,
    'title', title,
    'summary', summary,
    'timeboxMinutes', estimated_minutes,
    'entities', '[]'::jsonb,
    'interactions', '[]'::jsonb,
    'assets', '[]'::jsonb,
    'accessibility', jsonb_build_object(
      'keyboardNavigation', true,
      'captions', true,
      'narration', true,
      'contrastMode', true
    )
  )
)
where scene_plan is null;

alter table quest_tasks
alter column template_id set not null;

alter table quest_tasks
alter column scene_plan set not null;

comment on column quests.needs_educator_review is 'Warned quests remain in educator inbox until reviewed.';
comment on column quest_tasks.scene_plan is 'Typed ScenePlan JSONB payload derived from compose contract v3.';
