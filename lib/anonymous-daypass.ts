import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { calculateSubscriptionEndDate } from './subscription-actions'
import { updateUserSubscription } from './subscription-actions'

const SESSION_ID_COOKIE_NAME = 'daypass_session_id'
const SESSION_ID_COOKIE_MAX_AGE = 3 * 60 * 60 // 3 hours in seconds (matches day pass limit)

/**
 * Generate a unique session ID for anonymous Day Pass
 */
export function generateSessionId(): string {
  return crypto.randomUUID()
}

/**
 * Get session ID from cookie in request
 */
export function getSessionIdFromCookie(request: NextRequest): string | null {
  const cookie = request.cookies.get(SESSION_ID_COOKIE_NAME)
  return cookie?.value || null
}

/**
 * Set session ID in response cookie
 */
export function setSessionIdCookie(sessionId: string, response: Response): void {
  const isProduction = process.env.NODE_ENV === 'production'
  
  response.headers.append(
    'Set-Cookie',
    `${SESSION_ID_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${SESSION_ID_COOKIE_MAX_AGE}; ${isProduction ? 'Secure; HttpOnly; SameSite=Strict' : 'SameSite=Lax'}`
  )
}

/**
 * Check if an anonymous Day Pass is active for the given session ID
 */
export async function hasActiveAnonymousDayPass(sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) {
      return false
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('anonymous_daypass')
      .select('expires_at, user_id')
      .eq('session_id', sessionId)
      .single()

    if (error || !data) {
      return false
    }

    // Check if Day Pass has expired
    const expiresAt = new Date(data.expires_at)
    const now = new Date()
    
    if (expiresAt < now) {
      return false
    }

    // If user_id is set, it means the Day Pass has been merged to an account
    // In that case, we should check the user's profile instead
    if (data.user_id) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking anonymous Day Pass:', error)
    return false
  }
}

/**
 * Create or update an anonymous Day Pass record
 */
export async function createAnonymousDayPass(params: {
  sessionId: string
  paymentProvider: 'paystack' | 'paypal'
  transactionRef: string
}): Promise<void> {
  const supabase = await createClient()
  const expiresAt = calculateSubscriptionEndDate('daypass')

  const { error } = await supabase
    .from('anonymous_daypass')
    .upsert({
      session_id: params.sessionId,
      expires_at: expiresAt.toISOString(),
      payment_provider: params.paymentProvider,
      transaction_ref: params.transactionRef,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'session_id',
    })

  if (error) {
    throw new Error(`Failed to create anonymous Day Pass: ${error.message}`)
  }
}

/**
 * Merge an anonymous Day Pass to a user account
 * This is called when a user with an active anonymous Day Pass signs up or logs in
 */
export async function mergeAnonymousDayPassToUser(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    if (!sessionId || !userId) {
      return false
    }

    const supabase = await createClient()

    // Check if there's an active anonymous Day Pass
    const { data: dayPass, error: fetchError } = await supabase
      .from('anonymous_daypass')
      .select('expires_at, payment_provider, transaction_ref')
      .eq('session_id', sessionId)
      .is('user_id', null)
      .single()

    if (fetchError || !dayPass) {
      return false
    }

    // Check if Day Pass is still valid
    const expiresAt = new Date(dayPass.expires_at)
    const now = new Date()
    
    if (expiresAt < now) {
      return false
    }

    // Update user's profile with Day Pass subscription
    await updateUserSubscription({
      userId,
      tier: 'daypass',
      status: 'active',
      endDate: expiresAt,
      paystackTransactionRef: dayPass.payment_provider === 'paystack' ? dayPass.transaction_ref : undefined,
      paypalOrderId: dayPass.payment_provider === 'paypal' ? dayPass.transaction_ref : undefined,
      paymentProvider: dayPass.payment_provider,
    })

    // Mark the anonymous Day Pass as merged by setting user_id
    const { error: updateError } = await supabase
      .from('anonymous_daypass')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)

    if (updateError) {
      console.error('Failed to mark Day Pass as merged:', updateError)
      // Don't throw - the user subscription is already updated
    }

    return true
  } catch (error) {
    console.error('Error merging anonymous Day Pass:', error)
    return false
  }
}

/**
 * Get session ID from client-side (browser)
 * This is used in client components
 */
export function getSessionIdFromClient(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === SESSION_ID_COOKIE_NAME) {
      return value
    }
  }
  return null
}
