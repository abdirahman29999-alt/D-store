ALTER TABLE public.shop_state FORCE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.shop_state FROM anon, authenticated;
REVOKE ALL ON public.admin_auth FROM anon, authenticated;

GRANT SELECT ON public.shop_state TO anon, authenticated;
GRANT ALL ON public.shop_state TO service_role;
GRANT ALL ON public.admin_auth TO service_role;