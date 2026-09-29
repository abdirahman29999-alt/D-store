create policy "Admin auth is server only"
on public.admin_auth
for all
to anon, authenticated
using (false)
with check (false);