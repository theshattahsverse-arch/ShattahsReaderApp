import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { mergeAnonymousDayPassToUser } from '@/lib/anonymous-daypass'

const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'
const REDDIT_ME_URL = 'https://oauth.reddit.com/api/v1/me'

/** Synthetic email for Reddit-only users (no email from Reddit). Must be deterministic per Reddit id. */
function redditEmail(redditId: string): string {
  return `reddit_${redditId}@reddit.oauth`
}

/**
 * Exchange Reddit auth code for access token.
 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string } | null> {
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ShattahsReaderApp/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Reddit token exchange failed:', res.status, text)
    return null
  }

  const data = (await res.json()) as { access_token?: string }
  return data.access_token ? { access_token: data.access_token } : null
}

/**
 * Fetch Reddit user profile (id, name, icon_img optional).
 */
async function fetchRedditUser(accessToken: string): Promise<{
  id: string
  name: string
  icon_img?: string
} | null> {
  const res = await fetch(REDDIT_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'ShattahsReaderApp/1.0',
    },
  })
  if (!res.ok) {
    console.error('Reddit /api/v1/me failed:', res.status)
    return null
  }
  const data = (await res.json()) as { id?: string; name?: string; icon_img?: string }
  if (!data.id || !data.name) return null
  return {
    id: data.id,
    name: data.name,
    icon_img: data.icon_img,
  }
}

/**
 * GET /auth/reddit/callback
 * Handles Reddit OAuth callback: exchange code, get user, create/update Supabase user, sign in via magic link.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const next = searchParams.get('next') ?? '/'

  // Must match exactly the redirect_uri used in the authorize request (see /auth/reddit route).
  const canonicalOrigin =
    process.env.REDDIT_REDIRECT_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    'https://shattahsverse.com'
  const redirectUri = `${canonicalOrigin.replace(/\/$/, '')}/auth/reddit/callback`

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=Reddit+denied+access`, request.url)
    )
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('reddit_oauth_state')?.value
  if (!state || state !== savedState) {
    const res = NextResponse.redirect(
      new URL('/login?error=Invalid+state+please+try+again', request.url)
    )
    res.cookies.set('reddit_oauth_state', '', { path: '/', maxAge: 0 })
    return res
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+authorization+code', request.url)
    )
  }

  const tokenData = await exchangeCodeForToken(code, redirectUri)
  if (!tokenData) {
    return NextResponse.redirect(
      new URL('/login?error=Reddit+token+exchange+failed', request.url)
    )
  }

  const redditUser = await fetchRedditUser(tokenData.access_token)
  if (!redditUser) {
    return NextResponse.redirect(
      new URL('/login?error=Could+not+load+Reddit+profile', request.url)
    )
  }

  const email = redditEmail(redditUser.id)
  const supabase = createAdminClient()

  // Find or create auth user (use reddit_user_ids mapping to avoid listing all users)
  const { data: mapping } = await supabase
    .from('reddit_user_ids')
    .select('user_id')
    .eq('reddit_id', redditUser.id)
    .maybeSingle()

  let userId: string
  if (mapping?.user_id) {
    userId = mapping.user_id
  } else {
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: redditUser.name,
          avatar_url: redditUser.icon_img?.replace(/&amp;/g, '&') ?? null,
          provider: 'reddit',
          reddit_id: redditUser.id,
        },
      })
    if (createError || !createData.user) {
      console.error('Supabase create user failed:', createError)
      return NextResponse.redirect(
        new URL('/login?error=Account+creation+failed', request.url)
      )
    }
    userId = createData.user.id
    await supabase.from('reddit_user_ids').insert({
      reddit_id: redditUser.id,
      user_id: userId,
    })
  }

  // Upsert profile with platform = 'reddit'
  const avatarUrl = redditUser.icon_img?.replace(/&amp;/g, '&') ?? null
  await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: redditUser.name,
      avatar_url: avatarUrl,
      platform: 'reddit',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  // Generate magic link so the user gets a session without email
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('Magic link generation failed:', linkError)
    return NextResponse.redirect(
      new URL('/login?error=Sign-in+link+failed', request.url)
    )
  }

  // Merge anonymous Day Pass if present
  const sessionIdCookie = cookieStore.get('daypass_session_id')
  if (sessionIdCookie?.value) {
    try {
      await mergeAnonymousDayPassToUser(sessionIdCookie.value, userId)
    } catch (e) {
      console.error('Error merging anonymous Day Pass:', e)
    }
  }

  let actionLink = linkData.properties.action_link
  if (!actionLink.startsWith('http')) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
    actionLink = `${base}/${actionLink.replace(/^\//, '')}`
  }
  const res = NextResponse.redirect(actionLink)
  res.cookies.set('reddit_oauth_state', '', { path: '/', maxAge: 0 })
  return res
}
