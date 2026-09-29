DROP POLICY IF EXISTS "Shop state is publicly readable" ON public.shop_state;

CREATE POLICY "Shop state is server only"
  ON public.shop_state FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

REVOKE ALL ON public.shop_state FROM anon, authenticated;
GRANT ALL ON public.shop_state TO service_role;