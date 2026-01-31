import { supabase } from "@/lib/supabase/client"

export async function getCurrentUser() {
  try {
    // Get authenticated user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log("No authenticated user found")
      return null
    }

    console.log("Auth user found:", user.email)

    // Get user details from users table using auth_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)  // ✅ auth_id se match karo, id se nahi!
      .single()

    if (userError || !userData) {
      console.error("User not found in users table:", userError)
      throw new Error('User account not found. Please contact administrator.')
    }

    console.log("User data found:", userData.full_name)
    return userData

  } catch (error) {
    console.error('getCurrentUser error:', error)
    throw error
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}