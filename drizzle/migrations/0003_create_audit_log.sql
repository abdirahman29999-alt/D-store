CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL DEFAULT 'administrateur',
  action text NOT NULL,
  details text NOT NULL DEFAULT '',
  success boolean NOT NULL DEFAULT true
);

REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "Audit log is server only"
  ON public.audit_log FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);