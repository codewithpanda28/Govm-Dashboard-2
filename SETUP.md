# Setup Instructions for Railway Police Analytics Dashboard

## Access Denied Error - Solution

If you're getting an "Access denied" error, it means your user account doesn't have the correct role. This dashboard only allows:
- `super_admin`
- `district_admin` 
- `viewer`

It **blocks**:
- `station_officer`
- `data_operator`

## Option 1: Create Admin User via SQL (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Step 1: Create auth user (you'll need to use Supabase Dashboard > Authentication > Add User)
-- Or use the Supabase Management API

-- Step 2: After creating auth user, insert into users table
-- Replace 'YOUR_AUTH_USER_ID' with the actual auth user ID from Supabase Auth

INSERT INTO users (
  auth_id,
  email,
  full_name,
  role,
  is_active,
  is_first_login,
  employee_id
) VALUES (
  'YOUR_AUTH_USER_ID',  -- Get this from Supabase Auth > Users
  'admin@railwaypolice.gov.in',
  'Super Administrator',
  'super_admin',
  true,
  true,
  'ADMIN001'
) ON CONFLICT (auth_id) DO UPDATE SET
  role = 'super_admin',
  is_active = true;
```

## Option 2: Create User via Supabase Dashboard

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" or "Invite User"
3. Enter email: `admin@railwaypolice.gov.in`
4. Set password: `Admin@123456` (or your preferred password)
5. Confirm the email
6. Copy the User ID (UUID)
7. Go to SQL Editor and run:

```sql
INSERT INTO users (
  auth_id,
  email,
  full_name,
  role,
  is_active,
  is_first_login
) VALUES (
  'PASTE_USER_ID_HERE',  -- The UUID from step 6
  'admin@railwaypolice.gov.in',
  'Super Administrator',
  'super_admin',
  true,
  true
);
```

## Option 3: Update Existing User Role

If you already have a user account but wrong role:

```sql
-- Update user role to super_admin
UPDATE users 
SET role = 'super_admin', is_active = true
WHERE email = 'your-email@example.com';
```

## Option 4: Use Existing Portal 1 User

If you have access to Portal 1 (Data Entry Portal), you can update your user role:

```sql
-- Change your role from station_officer/data_operator to super_admin
UPDATE users 
SET role = 'super_admin'
WHERE email = 'your-existing-email@example.com';
```

## Test Credentials (After Setup)

**Email:** `admin@railwaypolice.gov.in`  
**Password:** `Admin@123456` (or the password you set)

⚠️ **Important:** Change the password after first login!

## Troubleshooting

### "User not found" error
- Make sure the user exists in Supabase Auth
- Check that `auth_id` in users table matches the Auth user ID

### "Access denied" error
- Verify the user's role is `super_admin`, `district_admin`, or `viewer`
- Check that `is_active` is `true` in the users table

### "Insufficient permissions" error
- Your role must be one of: `super_admin`, `district_admin`, `viewer`
- Users with `station_officer` or `data_operator` roles cannot access this dashboard

## Quick SQL Check

Check your current user roles:

```sql
SELECT id, email, full_name, role, is_active 
FROM users 
ORDER BY created_at DESC;
```

## Need Help?

1. Check Supabase Dashboard > Authentication > Users to see all auth users
2. Check Supabase Dashboard > Table Editor > users to see user records
3. Ensure `auth_id` in users table matches the Auth user ID



