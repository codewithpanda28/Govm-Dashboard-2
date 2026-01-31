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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      user_id,
      auth_id,
      password, // Optional - only if changing
      full_name,
      mobile,
      role,
      designation,
      rank,
      district_id,
      thana_id,
      railway_district_id,
      police_station_id,
      belt_number,
      employee_id,
      is_active
    } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('📝 Updating user:', user_id)

    // ✅ Update auth password if provided
    if (auth_id && password) {
      console.log('🔐 Updating password...')
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        auth_id,
        { password: password }
      )
      
      if (authError) {
        console.error('⚠️ Password update failed:', authError)
      } else {
        console.log('✅ Password updated')
      }
    }

    // ✅ Update users table
    const updateData: any = {
      full_name,
      mobile: mobile || null,
      role: role || 'station_officer',
      designation: designation || null,
      rank: rank || null,
      district_id: district_id || null,
      thana_id: thana_id || null,
      railway_district_id: railway_district_id || null,
      police_station_id: police_station_id || null,
      belt_number: belt_number || null,
      employee_id: employee_id || null,
      is_active: is_active !== false
    }

    if (password) {
      updateData.password_hash = password
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user_id)
      .select()
      .single()

    if (error) {
      console.error('❌ Update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ User updated successfully')

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: data
    })

  } catch (error: any) {
    console.error('💥 Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}