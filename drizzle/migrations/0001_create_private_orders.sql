CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total integer NOT NULL DEFAULT 0,
  payment_label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'nouvelle'
);

GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

CREATE POLICY "Orders are server only"
  ON public.orders FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);