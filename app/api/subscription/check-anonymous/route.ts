import { NextRequest, NextResponse } from 'next/server'
import { getSessionIdFromCookie, hasActiveAnonymousDayPass } from '@/lib/anonymous-daypass'

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionIdFromCookie(request)
    
    if (!sessionId) {
      return NextResponse.json({ hasActiveDayPass: false })
    }

    const hasActive = await hasActiveAnonymousDayPass(sessionId)
    
    return NextResponse.json({ hasActiveDayPass: hasActive })
  } catch (error: any) {
    console.error('Error checking anonymous Day Pass:', error)
    return NextResponse.json({ hasActiveDayPass: false })
  }
}
