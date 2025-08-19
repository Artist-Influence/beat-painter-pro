
-- Grant 'admin' role to the specified user by email, without relying on a unique constraint
insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role
from auth.users u
where lower(u.email) = lower('jared@artistinfluence.com')
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id
      and ur.role = 'admin'::app_role
  );
