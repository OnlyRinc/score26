-- Score26 Live-Ansicht: einmal im Supabase SQL-Editor ausführen.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.live_tournaments (
  id text primary key,
  pin_hash text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.live_tournaments enable row level security;

grant select on public.live_tournaments to anon, authenticated;

drop policy if exists "Live lesen fuer alle" on public.live_tournaments;
create policy "Live lesen fuer alle" on public.live_tournaments for select using (true);

-- Schreiben nur über diese Funktion und nur mit der richtigen Turnier-PIN.
create or replace function public.publish_live(p_id text, p_pin text, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  existing text;
begin
  if p_pin is null or length(p_pin) < 4 then
    return false;
  end if;
  select pin_hash into existing from live_tournaments where id = p_id;
  if existing is null then
    insert into live_tournaments (id, pin_hash, data) values (p_id, crypt(p_pin, gen_salt('bf')), p_data);
    return true;
  end if;
  if existing = crypt(p_pin, existing) then
    update live_tournaments set data = p_data, updated_at = now() where id = p_id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.publish_live(text, text, jsonb) from public;
grant execute on function public.publish_live(text, text, jsonb) to anon, authenticated;

-- Echtzeit-Updates einschalten
do $$
begin
  alter publication supabase_realtime add table public.live_tournaments;
exception when duplicate_object then null;
end $$;
