CREATE TABLE IF NOT EXISTS public.admin_auth (
  id TEXT PRIMARY KEY,
  password_hash TEXT,
  recovery_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_auth TO service_role;
ALTER TABLE public.admin_auth ENABLE ROW LEVEL SECURITY;