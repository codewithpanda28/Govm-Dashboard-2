# Quick Start Guide

## Default Admin Credentials

After setting up the database (see SETUP.md), you can use:

**Email:** `admin@railwaypolice.gov.in`  
**Password:** `Admin@123456`

⚠️ **Change this password immediately after first login!**

## Steps to Get Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Admin User

**Option A: Via Supabase SQL Editor (Easiest)**

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this SQL (replace `YOUR_AUTH_USER_ID`):

```sql
-- First, create user in Supabase Auth Dashboard > Authentication > Users
-- Then run this:

INSERT INTO users (
  auth_id,
  email,
  full_name,
  role,
  is_active,
  is_first_login
) VALUES (
  'YOUR_AUTH_USER_ID',  -- Get from Auth > Users
  'admin@railwaypolice.gov.in',
  'Super Administrator',
  'super_admin',
  true,
  true
);
```

**Option B: Update Existing User**

If you already have a user from Portal 1:

```sql
UPDATE users 
SET role = 'super_admin', is_active = true
WHERE email = 'your-email@example.com';
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Login
- Go to http://localhost:3000
- Use the credentials above
- You'll be redirected to change password on first login

## Common Issues

**Access Denied Error:**
- Your user role must be `super_admin`, `district_admin`, or `viewer`
- Check: `SELECT role FROM users WHERE email = 'your-email';`

**User Not Found:**
- User must exist in both Supabase Auth AND users table
- `auth_id` in users table must match Auth user ID

**Can't Login:**
- Verify email/password in Supabase Auth
- Check `is_active = true` in users table



