create extension if not exists "pgcrypto";

create type public.organization_role as enum ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
create type public.social_provider as enum ('meta');
create type public.account_status as enum ('ACTIVE', 'TOKEN_EXPIRED', 'DISCONNECTED');
create type public.post_status as enum ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'OWNER',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider public.social_provider not null,
  scopes text[] not null default '{}',
  access_token_ciphertext text not null,
  access_token_iv text not null,
  access_token_tag text not null,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  refresh_token_tag text,
  expires_at timestamptz,
  refresh_failures int not null default 0,
  status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  oauth_connection_id uuid not null references public.oauth_connections(id) on delete cascade,
  provider public.social_provider not null,
  provider_account_id text not null,
  username text not null,
  avatar_url text,
  status public.account_status not null default 'ACTIVE',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  body text not null check (char_length(body) <= 2200),
  media_urls text[] not null default '{}',
  scheduled_for timestamptz,
  published_at timestamptz,
  status public.post_status not null default 'DRAFT',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  provider_post_id text,
  status public.post_status not null default 'SCHEDULED',
  error_message text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, social_account_id)
);

create table public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  provider_metric_id text not null,
  metric_date date not null,
  impressions int not null default 0 check (impressions >= 0),
  reach int not null default 0 check (reach >= 0),
  engagement int not null default 0 check (engagement >= 0),
  followers int not null default 0 check (followers >= 0),
  created_at timestamptz not null default now(),
  unique (social_account_id, provider_metric_id, metric_date)
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider public.social_provider not null,
  event_type text not null,
  payload jsonb not null default '{}',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index organizations_slug_idx on public.organizations(slug);
create index organization_members_user_idx on public.organization_members(user_id);
create index social_accounts_org_idx on public.social_accounts(organization_id);
create index posts_org_status_scheduled_idx on public.posts(organization_id, status, scheduled_for);
create index post_targets_account_status_idx on public.post_targets(social_account_id, status);
create index metric_snapshots_org_date_idx on public.metric_snapshots(organization_id, metric_date desc);
create index oauth_connections_expiry_idx on public.oauth_connections(status, expires_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function public.touch_updated_at();

create trigger oauth_connections_touch_updated_at
before update on public.oauth_connections
for each row execute function public.touch_updated_at();

create trigger social_accounts_touch_updated_at
before update on public.social_accounts
for each row execute function public.touch_updated_at();

create trigger posts_touch_updated_at
before update on public.posts
for each row execute function public.touch_updated_at();

create trigger post_targets_touch_updated_at
before update on public.post_targets
for each row execute function public.touch_updated_at();

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.oauth_connections enable row level security;
alter table public.social_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.post_targets enable row level security;
alter table public.metric_snapshots enable row level security;
alter table public.integration_events enable row level security;

create policy "members can read organizations"
on public.organizations for select
using (public.is_org_member(id));

create policy "members can read memberships"
on public.organization_members for select
using (public.is_org_member(organization_id));

create policy "users can read own oauth connections"
on public.oauth_connections for select
using (user_id = auth.uid());

create policy "members can read social accounts"
on public.social_accounts for select
using (public.is_org_member(organization_id));

create policy "members can manage posts"
on public.posts for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "members can read post targets"
on public.post_targets for select
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_targets.post_id
      and public.is_org_member(posts.organization_id)
  )
);

create policy "members can read metric snapshots"
on public.metric_snapshots for select
using (public.is_org_member(organization_id));

create policy "members can read integration events"
on public.integration_events for select
using (organization_id is not null and public.is_org_member(organization_id));
