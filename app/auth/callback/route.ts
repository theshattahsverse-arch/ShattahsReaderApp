import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { mergeAnonymousDayPassToUser } from '@/lib/anonymous-daypass'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      // Check for anonymous Day Pass and merge if present
      const cookieStore = await cookies()
      const sessionIdCookie = cookieStore.get('daypass_session_id')
      if (sessionIdCookie?.value) {
        try {
          await mergeAnonymousDayPassToUser(sessionIdCookie.value, data.user.id)
        } catch (error) {
          console.error('Error merging anonymous Day Pass:', error)
          // Don't fail the OAuth flow if merge fails
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}

