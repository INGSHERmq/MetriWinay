alter table public.social_accounts
add column if not exists account_type text not null default 'facebook_page',
add column if not exists account_access_token_ciphertext text,
add column if not exists account_access_token_iv text,
add column if not exists account_access_token_tag text;

create index if not exists social_accounts_type_idx
on public.social_accounts(organization_id, account_type);
