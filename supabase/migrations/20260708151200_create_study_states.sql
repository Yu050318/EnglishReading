create table if not exists public.study_states (
  device_id text primary key,
  device_secret_hash text,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  user_id uuid,
  constraint study_states_device_id_length check (char_length(device_id) between 8 and 128),
  constraint study_states_state_is_object check (jsonb_typeof(state) = 'object')
);

alter table public.study_states enable row level security;

create unique index if not exists study_states_user_id_key on public.study_states(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists study_states_set_updated_at on public.study_states;
create trigger study_states_set_updated_at
before update on public.study_states
for each row execute function public.set_updated_at();

create policy "authenticated users can read own study state"
on public.study_states
for select
to authenticated
using (user_id = auth.uid());

create policy "authenticated users can insert own study state"
on public.study_states
for insert
to authenticated
with check (user_id = auth.uid());

create policy "authenticated users can update own study state"
on public.study_states
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create extension if not exists pgcrypto;

create or replace function public.load_study_state(
  p_device_id text,
  p_device_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  hashed_secret text := encode(extensions.digest(convert_to(p_device_secret, 'UTF8'), 'sha256'), 'hex');
  saved_state jsonb;
begin
  select state into saved_state
  from public.study_states
  where device_id = p_device_id
    and device_secret_hash = hashed_secret;

  return saved_state;
end;
$$;

create or replace function public.save_study_state(
  p_device_id text,
  p_device_secret text,
  p_state jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  hashed_secret text := encode(extensions.digest(convert_to(p_device_secret, 'UTF8'), 'sha256'), 'hex');
begin
  if char_length(p_device_id) < 8 or char_length(p_device_id) > 128 then
    raise exception 'invalid device id';
  end if;
  if char_length(p_device_secret) < 24 then
    raise exception 'invalid device secret';
  end if;
  if jsonb_typeof(p_state) <> 'object' then
    raise exception 'state must be an object';
  end if;

  insert into public.study_states(device_id, device_secret_hash, state)
  values (p_device_id, hashed_secret, p_state)
  on conflict (device_id) do update
    set state = excluded.state,
        updated_at = now()
    where public.study_states.device_secret_hash = hashed_secret;

  if not found then
    raise exception 'invalid device secret';
  end if;
end;
$$;

revoke all on public.study_states from anon, authenticated;
grant execute on function public.load_study_state(text, text) to anon, authenticated;
grant execute on function public.save_study_state(text, text, jsonb) to anon, authenticated;
