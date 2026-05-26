alter table discovery_posts
add column if not exists state text;

update discovery_posts
set state = case
  when status = 'approved' then 'live'
  when status = 'pending_parent_approval' then 'pending_parent_approval'
  else 'draft'
end
where state is null;

alter table discovery_posts
alter column state set not null;

alter table discovery_posts
drop constraint if exists discovery_posts_state_check;

alter table discovery_posts
add constraint discovery_posts_state_check
check (state in ('draft', 'pending_parent_approval', 'live', 'rejected', 'removed'));

alter table discovery_posts
add column if not exists moderation_state text;

update discovery_posts
set moderation_state = coalesce(moderation ->> 'verdict', 'pass')
where moderation_state is null;

alter table discovery_posts
alter column moderation_state set not null;

alter table discovery_posts
drop constraint if exists discovery_posts_moderation_state_check;

alter table discovery_posts
add constraint discovery_posts_moderation_state_check
check (moderation_state in ('pass', 'warn', 'block', 'reported'));

alter table discovery_posts
add column if not exists parent_approved_at timestamptz;

alter table discovery_posts
add column if not exists parent_rejected_at timestamptz;

create index if not exists discovery_posts_parent_queue_idx
on discovery_posts (state, created_at desc, id desc);
