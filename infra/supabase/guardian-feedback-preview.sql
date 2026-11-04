-- Additive operator rollout for the EXISTING dedicated synthetic preview only.
-- Apply 0015 through the migration runner before this file. Never grant browser access.
begin;
do $$ begin
  if not exists (select 1 from headstrong_private.preview_configuration where singleton and synthetic_only) then
    raise exception 'Not a configured synthetic preview';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'headstrong_preview_api'
    and not rolsuper and not rolbypassrls and not rolcreatedb and not rolcreaterole)
    or exists (select 1 from pg_auth_members where member = 'headstrong_preview_api'::regrole)
    or exists (select 1 from pg_class where oid = 'public.learning_guardian_feedback'::regclass
      and relowner = 'headstrong_preview_api'::regrole) then
    raise exception 'Unsafe or unavailable preview runtime role';
  end if;
end $$;
alter table public.learning_guardian_feedback enable row level security;
revoke all on public.learning_guardian_feedback from public, headstrong_preview_api;
do $$ declare browser_role text; begin
  foreach browser_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = browser_role) then
      execute format('revoke all on public.learning_guardian_feedback from %I', browser_role);
    end if;
  end loop;
end $$;
drop policy if exists headstrong_server_only on public.learning_guardian_feedback;
create policy headstrong_server_only on public.learning_guardian_feedback
  to headstrong_preview_api using (true) with check (true);
grant select, insert on public.learning_guardian_feedback to headstrong_preview_api;
commit;
