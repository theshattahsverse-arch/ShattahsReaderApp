import { NextRequest, NextResponse } from 'next/server'

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize'
const REDDIT_SCOPES = 'identity'

/**
 * GET /auth/reddit
 * Redirects the user to Reddit OAuth consent screen.
 * Requires env: REDDIT_CLIENT_ID, and redirect URI must be registered in Reddit app.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.REDDIT_CLIENT_ID
  if (!clientId) {
    console.error('REDDIT_CLIENT_ID is not set')
    return NextResponse.redirect(
      new URL('/login?error=Reddit+login+is+not+configured', request.url)
    )
  }

  // Use canonical origin so redirect_uri matches exactly what you registered on Reddit (www vs non-www).
  const canonicalOrigin =
    process.env.REDDIT_REDIRECT_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    'https://shattahsverse.com'
  const redirectUri = `${canonicalOrigin.replace(/\/$/, '')}/auth/reddit/callback`

  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state,
    redirect_uri: redirectUri,
    duration: 'permanent',
    scope: REDDIT_SCOPES,
  })

  const authUrl = `${REDDIT_AUTH_URL}?${params.toString()}`
  const res = NextResponse.redirect(authUrl)
  res.cookies.set('reddit_oauth_state', state, {
    path: '/',
    maxAge: 60 * 10,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
