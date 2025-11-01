# 🚀 Quick Start - Create Your First Admin

## ⚡ FASTEST METHOD (For Testing/Development)

### Step 1: Create User in Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/hhhcesxsxtuqnnmaspdc/auth/users
2. Click **"Add User"**
3. Enter:
   - **Email**: `admin@cukashmir.ac.in` (or any email)
   - **Password**: `AdminTest123!@#`
   - **Auto Confirm User**: ✅ CHECK THIS (skip email verification)
4. Click **"Create User"**

### Step 2: Grant Admin Role
1. Go to: https://supabase.com/dashboard/project/hhhcesxsxtuqnnmaspdc/sql/new
2. Copy and paste this SQL:

```sql
-- Replace 'admin@cukashmir.ac.in' with your email from Step 1
DO $$
DECLARE
  admin_email TEXT := 'admin@cukashmir.ac.in'; -- CHANGE THIS
  user_uuid UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_uuid FROM auth.users WHERE email = admin_email;
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User % not found', admin_email;
  END IF;
  
  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_uuid, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update profile
  UPDATE public.profiles
  SET user_type = 'admin'
  WHERE user_id = user_uuid;
  
  RAISE NOTICE 'SUCCESS: Admin role granted to %', admin_email;
END $$;
```

3. Click **"Run"**
4. You should see: **"SUCCESS: Admin role granted to..."**

### Step 3: Login!
1. Open your app: `/admin-login`
2. Login with:
   - Email: `admin@cukashmir.ac.in`
   - Password: `AdminTest123!@#`
3. You're in! 🎉

---

## ✅ Verify Everything Works

### Test Checklist:
- [ ] Admin login successful
- [ ] Can access Admin Dashboard
- [ ] Can navigate to "Manage Admins" page
- [ ] Can create new department admins
- [ ] Can view all admin users
- [ ] Students can sign up at `/auth`
- [ ] Students can login and see their dashboard

---

## 🔒 For Production

### Before Going Live:

1. **Enable Email Confirmation**
   - Go to: https://supabase.com/dashboard/project/hhhcesxsxtuqnnmaspdc/auth/providers
   - Enable "Confirm email"
   - Configure email templates

2. **Set Site URL**
   - Go to: https://supabase.com/dashboard/project/hhhcesxsxtuqnnmaspdc/auth/url-configuration
   - Site URL: `https://your-production-domain.com`
   - Redirect URLs: `https://your-production-domain.com/**`

3. **Change Default Admin Password**
   - Login to admin account
   - Go to Supabase → Auth → Users
   - Reset password for admin user

4. **Review Security Settings**
   - Read ADMIN_SETUP_GUIDE.md
   - Review all RLS policies
   - Test all authentication flows

---

## 🆘 Troubleshooting

### "Access Denied" when logging in
**Solution**: Make sure you ran the SQL script in Step 2. The user_roles table must have an entry.

**Verify with SQL**:
```sql
SELECT u.email, ur.role 
FROM auth.users u 
JOIN user_roles ur ON ur.user_id = u.id 
WHERE u.email = 'admin@cukashmir.ac.in';
```
You should see your email with 'admin' role.

### "User not found" error in SQL
**Solution**: Create the user in Supabase Dashboard first (Step 1).

### Can't see Admin Dashboard
**Solution**: Make sure you're logging in at `/admin-login` (not `/auth`).

### Email confirmation required
**Solution**: Either:
- Check the email inbox for confirmation link, OR
- Disable "Confirm email" in Supabase Auth settings for testing

---

## 📊 Check Current Admins

Run this SQL to see all admin users:

```sql
SELECT 
  u.email,
  p.full_name,
  ur.role,
  u.created_at
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'department_admin')
ORDER BY u.created_at DESC;
```

---

## 🎯 What's Next?

After creating your first admin:

1. **Add Departments**: Use Admin Dashboard → Departments tab
2. **Add Department Admins**: Use "Manage Admins" page
3. **Add Students**: Students can self-register at `/auth`
4. **Configure Exam Schedule**: Use Schedule Generator

---

## 💡 Pro Tips

- **Development**: Disable email confirmation for faster testing
- **Production**: Enable email confirmation and use strong passwords
- **Backup**: Export user data regularly from Supabase
- **Security**: Review ADMIN_SETUP_GUIDE.md for best practices

---

**Need Help?** Check the logs:
- Browser Console (F12)
- Supabase Dashboard → Logs
- Network tab for API errors

---

Last Updated: 2025-11-01
