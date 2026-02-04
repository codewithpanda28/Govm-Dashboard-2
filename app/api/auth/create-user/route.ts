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
    
    // ✅ Extract ALL fields including new ones
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
      is_active,
      // ✅ NEW FIELDS ADDED
      user_id,
      photo_url,
      higher_authority_id,
      state_id,
      zone_id
    } = body

    console.log('📝 Creating user:', {
      email,
      user_id,
      photo_url: photo_url ? 'Has photo' : 'No photo',
      higher_authority_id,
      state_id,
      zone_id
    })

    // Validation
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user exists by email
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

    // Check if user_id exists
    const { data: existingUserId } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('user_id', user_id.toLowerCase())
      .single()

    if (existingUserId) {
      return NextResponse.json(
        { error: 'This User ID is already taken. Please choose another.' },
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
        role: role || 'station_officer',
        user_id: user_id
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

    // ✅ Insert into users table with ALL FIELDS
    const insertData = {
      auth_id: authData.user.id,
      email: email.toLowerCase(),
      password_hash: password,
      full_name: full_name,
      mobile: mobile || null,
      role: role || 'station_officer',
      designation: designation || null,
      rank: rank || null,
      district_id: district_id ? parseInt(district_id) : null,
      thana_id: thana_id ? parseInt(thana_id) : null,
      belt_number: belt_number || null,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      // ✅ NEW FIELDS ADDED HERE
      user_id: user_id ? user_id.toLowerCase() : null,
      photo_url: photo_url || null,
      higher_authority_id: higher_authority_id ? parseInt(higher_authority_id) : null,
      state_id: state_id ? parseInt(state_id) : null,
      zone_id: zone_id ? parseInt(zone_id) : null
    }

    console.log('💾 Saving to database:', {
      user_id: insertData.user_id,
      photo_url: insertData.photo_url ? 'Yes' : 'No',
      higher_authority_id: insertData.higher_authority_id,
      state_id: insertData.state_id,
      zone_id: insertData.zone_id
    })

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert(insertData)
      .select()
      .single()

    if (userError) {
      console.error('❌ Database error:', userError)
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      )
    }

    console.log('✅ User created successfully:', {
      id: userData.id,
      user_id: userData.user_id,
      photo_url: userData.photo_url ? 'Saved' : 'Not saved',
      higher_authority_id: userData.higher_authority_id
    })

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