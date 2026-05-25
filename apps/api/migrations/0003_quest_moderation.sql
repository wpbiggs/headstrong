alter table quests
add column if not exists moderation jsonb;

update quests
set moderation = '{"labels":[],"verdict":"pass"}'::jsonb
where moderation is null;

alter table quests
alter column moderation set not null;

comment on column quests.moderation is 'Quest moderation metadata persisted as JSONB using the compose contract v2 shape.';
