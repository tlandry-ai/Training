-- Run this in your Supabase SQL editor

create table checkins (
  id uuid primary key default gen_random_uuid(),
  date_key text not null,
  block_id text not null,
  done boolean not null default false,
  created_at timestamptz default now(),
  unique(date_key, block_id)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  date_key text not null,
  text text not null,
  created_at timestamptz default now()
);

-- Disable RLS (private app, no multi-user)
alter table checkins disable row level security;
alter table notes disable row level security;
