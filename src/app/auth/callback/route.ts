import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // 💥 FIX: Add 'await' right here!
    const cookieStore = await cookies() 
    
    // Create a secure server-side Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Securely exchange the Google code for a session token
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Auth callback error:", error.message)
      return NextResponse.redirect(`${origin}/login?error=auth-failed`)
    }
  }

  // Once the session is stored in cookies, redirect the user back to the main form
  return NextResponse.redirect(origin)
}