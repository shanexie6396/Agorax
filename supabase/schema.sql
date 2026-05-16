-- Agorax single-user MVP schema

create table if not exists stocks (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,
  company_name text,
  buy_in_price numeric,
  sentiment_status text,
  thesis_now text,
  thesis text,
  bull_case text,
  bear_case text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table stocks add column if not exists buy_in_price numeric;
alter table stocks add column if not exists sentiment_status text;
alter table stocks add column if not exists thesis_now text;

create table if not exists price_snapshots (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid references stocks(id) on delete cascade,
  ticker text not null,
  current_price numeric,
  change_amount numeric,
  change_percent numeric,
  open_price numeric,
  high_price numeric,
  low_price numeric,
  previous_close numeric,
  fetched_at timestamp with time zone default now()
);

create table if not exists market_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date_key date not null,
  reflection jsonb not null,
  generated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, date_key)
);

-- For this personal MVP, Row Level Security is disabled.
-- Do not expose this as a public multi-user app without adding auth + RLS.
alter table stocks disable row level security;
alter table price_snapshots disable row level security;
alter table market_reflections disable row level security;
