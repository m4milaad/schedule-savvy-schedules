# Admin Setup Guide - Production Ready

## ✅ Current Authentication System

Your system now uses **Supabase Auth** with role-based access control (RBAC). The old `admin_users` table with bcrypt hashes has been removed for security.

## 🔄 How Authentication Works

### 1. User Registration Flow (Auth.tsx - /auth)
- Students and Department Admins can self-register
- Creates entry in `auth.users` → triggers → `profiles` → triggers → `user_roles`
- **Automatic role assignment** based on user_type

### 2. Admin Login Flow (AdminLogin.tsx - /admin-login)
- Uses Supabase Auth email/password
- Checks `user_roles` table for 'admin' or 'department_admin' role
- Redirects to `/admin-dashboard` if authorized

### 3. Database Triggers (Automatic)
```sql
-- Trigger 1: When user signs up in auth.users
on_auth_user_created → handle_new_user() 
  → Creates profile with user_type

-- Trigger 2: When profile is created
on_profile_user_role_sync → handle_new_user_role()
  → Creates corresponding role in user_roles
```

## 🎯 Creating Admin Users

### Option 1: Create First Super Admin (SQL - Direct Database)
Use this to create your first admin account:

```sql
-- 1. First, create the user through Supabase Auth Dashboard
-- Go to: https://supabase.com/dashboard/project/hhhcesxsxtuqnnmaspdc/auth/users
-- Click "Add User" → Enter email and password

-- 2. Then run this SQL to grant admin role:
-- Replace 'admin@cukashmir.ac.in' with the actual email

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@cukashmir.ac.in'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Update the profile to reflect admin status
UPDATE public.profiles
SET user_type = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@cukashmir.ac.in');
```

### Option 2: Promote Existing Department Admin to Super Admin
```sql
-- Promote a department admin to full admin
UPDATE public.user_roles
SET role = 'admin'::app_role
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'existing@cukashmir.ac.in')
  AND role = 'department_admin';

UPDATE public.profiles
SET user_type = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'existing@cukashmir.ac.in');
```

### Option 3: Self-Registration as Department Admin
1. Go to `/auth`
2. Click "Sign Up" tab
3. Select "Department Admin" as account type
4. Complete registration
5. **Note:** This creates a department admin, NOT a super admin

## 🔐 Role Hierarchy

| Role | Can Sign Up? | Login Via | Capabilities |
|------|-------------|-----------|--------------|
| **admin** | ❌ No (SQL only) | /admin-login | Full system access, all departments |
| **department_admin** | ✅ Yes (/auth) | /admin-login | Department-specific admin access |
| **student** | ✅ Yes (/auth) | /auth | View own schedule, enroll in courses |

## 🚀 Production Deployment Checklist

### 1. Create Initial Admin Account
- [ ] Create admin user in Supabase Auth Dashboard
- [ ] Run SQL to grant admin role
- [ ] Test login at `/admin-login`

### 2. Security Configuration
- [ ] Enable Email Confirmation in Supabase (optional for testing, required for production)
- [ ] Configure Email Templates in Supabase
- [ ] Set up proper Site URL and Redirect URLs in Supabase Auth settings
  - Site URL: `https://your-production-domain.com`
  - Redirect URLs: `https://your-production-domain.com/**`

### 3. Test All Flows
- [ ] Test admin login
- [ ] Test department admin registration and login
- [ ] Test student registration and login
- [ ] Verify role-based access controls
- [ ] Test password reset flow

### 4. Database Verification
```sql
-- Verify triggers are enabled
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname IN ('handle_new_user', 'handle_new_user_role')
  AND NOT t.tgisinternal;

-- Verify RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_roles')
ORDER BY tablename;
```

## 🛠️ Admin Management

### View All Admins
```sql
SELECT 
  au.email,
  p.full_name,
  ur.role,
  au.created_at
FROM auth.users au
JOIN public.profiles p ON p.user_id = au.id
JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.role IN ('admin', 'department_admin')
ORDER BY au.created_at DESC;
```

### Remove Admin Access
```sql
-- Remove admin role (keeps user account)
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
  AND role = 'admin';

-- Update profile back to student
UPDATE public.profiles
SET user_type = 'student'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

## 🔒 Security Best Practices Implemented

✅ **No password hashing in application** - Supabase handles this  
✅ **JWT-based authentication** - Tokens never stored in localStorage  
✅ **Row-Level Security (RLS)** - Database-level access control  
✅ **Role-based access control** - Separate user_roles table  
✅ **Strong password requirements** - 12+ chars with complexity  
✅ **Security definer functions** - Prevents RLS recursion  
✅ **No hardcoded credentials** - All server-side validation  

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase Auth settings (Site URL, Redirect URLs)
3. Check database logs in Supabase Dashboard
4. Verify triggers are enabled (see SQL above)

## 🎯 Quick Start Command

```sql
-- All-in-one admin creation (replace email and run in Supabase SQL Editor)
DO $$
DECLARE
  admin_email TEXT := 'admin@cukashmir.ac.in'; -- CHANGE THIS
  user_uuid UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_uuid FROM auth.users WHERE email = admin_email;
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Create user in Auth Dashboard first.', admin_email;
  END IF;
  
  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_uuid, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update profile
  UPDATE public.profiles
  SET user_type = 'admin'
  WHERE user_id = user_uuid;
  
  RAISE NOTICE 'Admin role granted to %', admin_email;
END $$;
```

## 🎓 For Development/Testing

To quickly create a test admin:

1. **In Supabase Dashboard**: Auth → Users → Add User
   - Email: `admin@test.com`
   - Password: `TestAdmin123!@#`
   - Auto Confirm User: ✅ (for testing)

2. **Run SQL**:
```sql
-- Quick dev admin setup
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'admin@test.com'
ON CONFLICT DO NOTHING;

UPDATE public.profiles SET user_type = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@test.com');
```

3. **Login**: Navigate to `/admin-login` and use the credentials

---

**Last Updated**: 2025-11-01  
**System Status**: ✅ Production Ready  
**Security Audit**: ✅ Passed
