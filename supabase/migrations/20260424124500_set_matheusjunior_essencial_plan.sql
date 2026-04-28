update public.profiles
set plan_type = 'essencial'::public.plan_type,
    updated_at = now()
where lower(email) = lower('matheusjuniorg.4@gmail.com');
