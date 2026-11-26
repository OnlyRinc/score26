-- Score26 Live-Ansicht: im Supabase SQL-Editor ausführen.
create extension if not exists pgcrypto with schema extensions;

-- Öffentlich lesbarer Turnierstand
create table if not exists public.live_tournaments (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.live_tournaments enable row level security;
grant select on public.live_tournaments to anon, authenticated;
drop policy if exists "Live lesen fuer alle" on public.live_tournaments;
create policy "Live lesen fuer alle" on public.live_tournaments for select using (true);

-- PINs liegen getrennt und sind für niemanden lesbar
create table if not exists public.live_pins (
  id text primary key,
  pin_hash text not null
);
alter table public.live_pins enable row level security;
revoke all on public.live_pins from anon, authenticated;

-- Umzug alter PIN-Spalte (falls vorhanden)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'live_tournaments' and column_name = 'pin_hash') then
    insert into public.live_pins (id, pin_hash) select id, pin_hash from public.live_tournaments on conflict (id) do nothing;
    alter table public.live_tournaments drop column pin_hash;
  end if;
end $$;

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
  select pin_hash into existing from live_pins where id = p_id;
  if existing is null then
    insert into live_pins (id, pin_hash) values (p_id, crypt(p_pin, gen_salt('bf')));
  elsif existing <> crypt(p_pin, existing) then
    return false;
  end if;
  insert into live_tournaments (id, data, updated_at) values (p_id, p_data, now())
    on conflict (id) do update set data = excluded.data, updated_at = now();
  return true;
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
