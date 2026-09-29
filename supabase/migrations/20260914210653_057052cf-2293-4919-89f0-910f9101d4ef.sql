-- Verrouillage des accès directs à la base (seul le serveur peut écrire)
revoke all on public.admin_auth from anon, authenticated;
revoke insert, update, delete, truncate on public.shop_state from anon, authenticated;
grant select on public.shop_state to anon, authenticated;
grant all on public.shop_state to service_role;
grant all on public.admin_auth to service_role;

alter table public.admin_auth enable row level security;
alter table public.admin_auth force row level security;
alter table public.shop_state enable row level security;

-- Protection contre les tentatives de connexion répétées
alter table public.admin_auth add column if not exists failed_count integer not null default 0;
alter table public.admin_auth add column if not exists locked_until timestamptz;