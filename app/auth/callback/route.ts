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
      // Ensure platform is set correctly for OAuth users
      try {
        // Get user profile to check if platform is set
        const { data: profile } = await supabase
          .from('profiles')
          .select('platform')
          .eq('id', data.user.id)
          .single()

        // Detect provider from user identities
        const identities = data.user.identities || []
        const provider = identities.length > 0 ? identities[0]?.provider : null
        
        // Determine platform based on provider
        let platform: string | null = null
        if (provider === 'google') {
          platform = 'google'
        } else if (provider === 'email') {
          platform = 'email'
        }

        // Update platform if it's missing or incorrect
        if (platform && (!profile || profile.platform !== platform)) {
          await supabase
            .from('profiles')
            .update({ platform })
            .eq('id', data.user.id)
        }
      } catch (error) {
        console.error('Error updating platform in callback:', error)
        // Don't fail the OAuth flow if platform update fails
      }

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

