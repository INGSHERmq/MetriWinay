create table if not exists public.ad_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id text not null,
  ad_account_name text,
  metric_date_start date not null,
  metric_date_stop date not null,
  impressions int not null default 0 check (impressions >= 0),
  reach int not null default 0 check (reach >= 0),
  spend numeric(12, 2) not null default 0 check (spend >= 0),
  clicks int not null default 0 check (clicks >= 0),
  engagement int not null default 0 check (engagement >= 0),
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (organization_id, ad_account_id, metric_date_start, metric_date_stop)
);

create index if not exists ad_metric_snapshots_org_date_idx
on public.ad_metric_snapshots(organization_id, metric_date_stop desc);

alter table public.ad_metric_snapshots enable row level security;

create policy "members can read ad metric snapshots"
on public.ad_metric_snapshots for select
using (public.is_org_member(organization_id));
