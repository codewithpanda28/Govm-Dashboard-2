import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      email,
      password,
      full_name,
      mobile,
      role,
      designation,
      rank,
      district_id,
      thana_id,
      belt_number,
      is_active
    } = body

    console.log('📝 Creating user:', email)

    // Validation
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: role || 'station_officer'
      }
    })

    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Insert into users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authData.user.id,
        email: email.toLowerCase(),
        password_hash: password,
        full_name: full_name,
        mobile: mobile || null,
        role: role || 'station_officer',
        designation: designation || null,
        rank: rank || null,
        district_id: district_id || null,
        thana_id: thana_id || null,
        belt_number: belt_number || null,
        is_active: is_active !== false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully!',
      user: userData
    })

  } catch (error: any) {
    console.error('💥 Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}