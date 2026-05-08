
-- Single-tenant personal finance schema (device-id based, no auth required)
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  name text not null,
  amount numeric not null,
  date_received date not null,
  recurrence text default 'once',
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  name text not null,
  amount numeric not null,
  due_date date not null,
  category text default 'umum',
  recurring boolean default false,
  paid boolean default false,
  created_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  creditor text not null,
  total_amount numeric not null,
  remaining numeric not null,
  priority int default 3,
  notes text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  category text not null,
  amount numeric not null,
  note text,
  spent_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index on public.incomes(device_id);
create index on public.bills(device_id, due_date);
create index on public.debts(device_id);
create index on public.expenses(device_id, spent_at desc);
create index on public.chat_messages(device_id, created_at);

alter table public.incomes enable row level security;
alter table public.bills enable row level security;
alter table public.debts enable row level security;
alter table public.expenses enable row level security;
alter table public.chat_messages enable row level security;

-- Open policies (single-user personal app, data scoped per device_id from client)
create policy "open incomes" on public.incomes for all using (true) with check (true);
create policy "open bills" on public.bills for all using (true) with check (true);
create policy "open debts" on public.debts for all using (true) with check (true);
create policy "open expenses" on public.expenses for all using (true) with check (true);
create policy "open chat" on public.chat_messages for all using (true) with check (true);
