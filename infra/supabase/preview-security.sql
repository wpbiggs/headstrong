-- OPERATOR-ONLY: apply after db:migrate to a NEW, dedicated synthetic preview DB.
-- Never apply to a shared Supabase project or an existing production database.
-- Password is deliberately absent: set it interactively with psql \password.
begin;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'headstrong_preview_api') then
    create role headstrong_preview_api login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
  if exists (select 1 from pg_roles where rolname = 'headstrong_preview_api'
    and (rolsuper or rolbypassrls or rolcreatedb or rolcreaterole)) then
    raise exception 'Refusing privileged runtime role';
  end if;
  if exists (select 1 from pg_auth_members where member = 'headstrong_preview_api'::regrole)
    or exists (select 1 from pg_class where relowner = 'headstrong_preview_api'::regrole and relnamespace = 'public'::regnamespace) then
    raise exception 'Runtime role must not own app tables or inherit other roles';
  end if;
end $$;

create schema if not exists headstrong_private;
revoke all on schema headstrong_private from public;
create table if not exists headstrong_private.preview_configuration (
  singleton boolean primary key default true check (singleton),
  synthetic_only boolean not null check (synthetic_only)
);
insert into headstrong_private.preview_configuration values (true, true) on conflict do nothing;
grant usage on schema public, headstrong_private to headstrong_preview_api;
revoke create on schema public from public;
grant select on headstrong_private.preview_configuration to headstrong_preview_api;

-- Explicit app table inventory; never touch Supabase-managed auth/storage schemas.
do $$ declare table_name text; browser_role text; begin
  foreach table_name in array array[
    'users', 'audit_events', 'parent_student_links', 'quests', 'quest_events', 'quest_tasks',
    'guilds', 'discovery_posts', 'discovery_reactions', 'discovery_reports', 'guild_memberships',
    'mastery_signals', 'lms_sync_events', 'campaigns', 'ledger_transactions', 'ledger_entries',
    'compute_jobs', 'curriculum_assets', 'curriculum_asset_edges', 'curriculum_asset_impacts',
    'compute_job_events', 'compute_job_results', 'provider_runs', 'learning_goals',
    'learning_evidence', 'learning_feedback', 'learning_satisfaction', 'auth_sessions',
    'headstrong_migrations'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public', table_name);
    execute format('revoke all on public.%I from headstrong_preview_api', table_name);
    foreach browser_role in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = browser_role) then
        execute format('revoke all on public.%I from %I', table_name, browser_role);
      end if;
    end loop;
  end loop;

  -- API role is server-only. Application authorization remains in the existing services;
  -- browser identities have neither table grants nor RLS policies.
  foreach table_name in array array[
    'users', 'parent_student_links', 'quests', 'quest_tasks', 'quest_events', 'auth_sessions',
    'audit_events', 'learning_goals', 'learning_evidence', 'learning_feedback', 'learning_satisfaction'
  ] loop
    execute format('drop policy if exists headstrong_server_only on public.%I', table_name);
    execute format('create policy headstrong_server_only on public.%I to headstrong_preview_api using (true) with check (true)', table_name);
  end loop;
end $$;

grant select on users, parent_student_links, quests, quest_tasks, quest_events, auth_sessions,
  learning_goals, learning_evidence, learning_feedback, learning_satisfaction to headstrong_preview_api;
grant insert on audit_events, learning_goals, learning_evidence, learning_feedback, learning_satisfaction to headstrong_preview_api;
grant update (quest_id) on learning_goals to headstrong_preview_api;
grant update (revoked_at) on auth_sessions to headstrong_preview_api;
-- PostgreSQL row locks require UPDATE privilege; no approval/role fields are writable.
grant update (id) on quests to headstrong_preview_api;
grant update (parent_id) on parent_student_links to headstrong_preview_api;

commit;
