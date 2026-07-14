-- Hosting Angel: AgQuip Field Days billeting
-- Run this once in the Supabase SQL Editor for project hhwrfssjihchofutiujs.
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)

create extension if not exists pgcrypto;

-- A "round" is one occurrence of the field days you're billeting for,
-- e.g. "AgQuip Field Days 2027". Keeps each year's hosts/guests separate.
create table if not exists billet_rounds (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  start_date date,
  end_date   date,
  created_at timestamptz not null default now()
);

create table if not exists billet_hosts (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references billet_rounds(id) on delete cascade,
  name       text not null,
  contact    text,
  capacity   int not null default 1,
  locality   text,
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists billet_guests (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references billet_rounds(id) on delete cascade,
  contact_name   text not null,
  phone          text,
  party_size     int not null default 1,
  arrival_date   date not null,
  departure_date date not null,
  notes          text,
  host_id        uuid references billet_hosts(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists billet_hosts_round_idx  on billet_hosts(round_id);
create index if not exists billet_guests_round_idx on billet_guests(round_id);
create index if not exists billet_guests_host_idx  on billet_guests(host_id);

-- Row Level Security: same open-anon-key pattern the rest of the app already
-- uses (see households/guests/events) — anyone with the anon key can read/write.
-- If you'd rather lock this down later, swap these for auth-scoped policies.
alter table billet_rounds enable row level security;
alter table billet_hosts  enable row level security;
alter table billet_guests enable row level security;

create policy "anon full access" on billet_rounds for all using (true) with check (true);
create policy "anon full access" on billet_hosts  for all using (true) with check (true);
create policy "anon full access" on billet_guests for all using (true) with check (true);
