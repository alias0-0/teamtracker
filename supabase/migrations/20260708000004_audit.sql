-- ============================================================================
-- Team Tracker — Audit triggers
-- ============================================================================
-- Automatic audit-log writes on admin-relevant actions. These fire regardless
-- of whether the change came through an RPC or a direct table write.
-- ============================================================================

create or replace function public.audit_dispatch_insert()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.audit_log (actor_id, action, target_id, metadata)
  values (
    new.admin_id, 'dispatch.create', new.id,
    jsonb_build_object('employee_id', new.employee_id, 'area_id', new.area_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_dispatch_insert on public.dispatches;
create trigger trg_audit_dispatch_insert after insert on public.dispatches
  for each row execute function public.audit_dispatch_insert();

create or replace function public.audit_sos_insert()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.audit_log (actor_id, action, target_id, metadata)
  values (
    new.admin_id, 'sos.broadcast', new.id,
    jsonb_build_object('area_id', new.area_id, 'radius_m', new.radius_m)
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_sos_insert on public.sos_pings;
create trigger trg_audit_sos_insert after insert on public.sos_pings
  for each row execute function public.audit_sos_insert();

create or replace function public.audit_profile_update()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  if old.role is distinct from new.role
     or old.dept_id is distinct from new.dept_id
     or old.area_id is distinct from new.area_id
     or old.active is distinct from new.active then
    insert into public.audit_log (actor_id, action, target_id, metadata)
    values (
      auth.uid(), 'profile.update', new.id,
      jsonb_build_object(
        'old_role', old.role,       'new_role', new.role,
        'old_dept', old.dept_id,    'new_dept', new.dept_id,
        'old_area', old.area_id,    'new_area', new.area_id,
        'old_active', old.active,   'new_active', new.active
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profile_update on public.profiles;
create trigger trg_audit_profile_update after update on public.profiles
  for each row execute function public.audit_profile_update();

-- ---------------------------------------------------------------------------
-- Audit log immutability: block updates and deletes
-- ---------------------------------------------------------------------------
create or replace function public.block_write()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is immutable';
end;
$$;

drop trigger if exists trg_audit_no_update on public.audit_log;
create trigger trg_audit_no_update before update on public.audit_log
  for each row execute function public.block_write();

drop trigger if exists trg_audit_no_delete on public.audit_log;
create trigger trg_audit_no_delete before delete on public.audit_log
  for each row execute function public.block_write();
