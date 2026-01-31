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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const auth_id = searchParams.get('auth_id')

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ Deleting user:', user_id)

    // ✅ Delete from Auth (if auth_id exists)
    if (auth_id && auth_id !== 'null') {
      console.log('🔐 Deleting auth user...')
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(auth_id)
      if (authError) {
        console.error('⚠️ Auth deletion failed:', authError)
      } else {
        console.log('✅ Auth user deleted')
      }
    }

    // ✅ Delete from users table
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id)

    if (error) {
      console.error('❌ Deletion failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ User deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error: any) {
    console.error('💥 Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}