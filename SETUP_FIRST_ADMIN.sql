-- Quick Setup: Create First Admin Account
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hhhcesxsxtuqnnmaspdc/sql/new

-- Step 1: Create the admin user
-- Note: You need to create the user in Supabase Dashboard first!
-- Go to: https://supabase.com/dashboard/project/hhhcesxsxtuqnnmaspdc/auth/users
-- Click "Add User" and enter:
--   Email: admin@admin.com
--   Password: admin123
--   Auto Confirm User: ✅ CHECK THIS

-- Step 2: After creating the user above, run this SQL:
DO $$
DECLARE
  admin_email TEXT := 'admin@admin.com';
  user_uuid UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found! Create user in Auth Dashboard first.';
  END IF;
  
  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_uuid, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    user_type = 'admin',
    full_name = 'Admin User',
    email = admin_email
  WHERE user_id = user_uuid;
  
  RAISE NOTICE 'SUCCESS: Admin account ready!';
  RAISE NOTICE 'Login at /admin-login with: admin@admin.com / admin123';
END $$;
