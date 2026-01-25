/**
 * Script to create a super admin user for the Analytics Dashboard
 * Run this using: npx tsx scripts/create-admin-user.ts
 * 
 * Make sure your .env.local file has the Supabase credentials
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const email = 'admin@railwaypolice.gov.in';
  const password = 'Admin@123456';
  const fullName = 'Super Administrator';

  try {
    console.log('Creating admin user...');
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        console.log('User already exists in auth. Checking users table...');
        
        // Try to sign in to get the user ID
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInData?.user) {
          const authId = signInData.user.id;
          
          // Check if user exists in users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authId)
            .single();

          if (existingUser) {
            // Update role to super_admin
            const { error: updateError } = await supabase
              .from('users')
              .update({ role: 'super_admin', is_active: true })
              .eq('auth_id', authId);

            if (updateError) {
              console.error('Error updating user:', updateError);
            } else {
              console.log('✅ User updated successfully!');
              console.log('\n📧 Email:', email);
              console.log('🔑 Password:', password);
              console.log('👤 Role: super_admin');
            }
          } else {
            // Create user record
            const { error: insertError } = await supabase.from('users').insert({
              auth_id: authId,
              email,
              full_name: fullName,
              role: 'super_admin',
              is_active: true,
              is_first_login: true,
            });

            if (insertError) {
              console.error('Error creating user record:', insertError);
            } else {
              console.log('✅ User created successfully!');
              console.log('\n📧 Email:', email);
              console.log('🔑 Password:', password);
              console.log('👤 Role: super_admin');
            }
          }
        }
        return;
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    // Create user record in users table
    const { error: userError } = await supabase.from('users').insert({
      auth_id: authData.user.id,
      email,
      full_name: fullName,
      role: 'super_admin',
      is_active: true,
      is_first_login: true,
    });

    if (userError) {
      console.error('Error creating user record:', userError);
      // Try to delete auth user if user record creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Role: super_admin');
    console.log('\n⚠️  Please change the password after first login!');
    
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();



