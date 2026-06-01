insert into public.organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'Winay Demo', 'winay-demo')
on conflict (slug) do nothing;
