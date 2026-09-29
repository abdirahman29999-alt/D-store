CREATE TABLE public.shop_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_state TO anon;
GRANT SELECT ON public.shop_state TO authenticated;
GRANT ALL ON public.shop_state TO service_role;

ALTER TABLE public.shop_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop state is publicly readable"
  ON public.shop_state FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.shop_state (id, data) VALUES ('main', '{}'::jsonb);