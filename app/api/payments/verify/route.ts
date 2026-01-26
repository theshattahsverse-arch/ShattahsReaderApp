import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackClient } from '@/lib/paystack'
import { updateUserSubscription, calculateSubscriptionEndDate } from '@/lib/subscription-actions'
import { createAnonymousDayPass, setSessionIdCookie, getSessionIdFromCookie } from '@/lib/anonymous-daypass'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get('reference')
    const trxref = searchParams.get('trxref') || reference

    if (!reference && !trxref) {
      return NextResponse.redirect(new URL('/subscription?error=no_reference', request.url))
    }

    const transactionRef = reference || trxref

    // Verify transaction with Paystack
    const transaction = await paystackClient.verifyTransaction(transactionRef)

    if (transaction.status !== 'success') {
      return NextResponse.redirect(
        new URL('/subscription?error=payment_failed', request.url)
      )
    }

    // Get metadata to determine plan type
    const metadata = transaction.metadata || {}
    const planName = metadata.plan_name
    const planType = metadata.plan_type
    const sessionId = metadata.session_id
    const isAnonymous = metadata.is_anonymous === 'true'

    if (!planName || !planType) {
      return NextResponse.redirect(
        new URL('/subscription?error=invalid_metadata', request.url)
      )
    }

    // Handle anonymous Day Pass purchase
    if (isAnonymous && sessionId && planType === 'daypass') {
      // Create anonymous Day Pass record
      await createAnonymousDayPass({
        sessionId,
        paymentProvider: 'paystack',
        transactionRef,
      })

      // Get redirect URL from metadata or default to comics page
      const redirectUrl = metadata.redirect_url || '/comics?success=true&plan=' + encodeURIComponent(planName) + '&anonymous=true'
      
      // Set session ID cookie
      const response = NextResponse.redirect(new URL(redirectUrl, request.url))
      setSessionIdCookie(sessionId, response)
      return response
    }

    // Handle authenticated user purchases
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Determine subscription tier and end date
    let tier: 'member' | 'daypass' = planType === 'daypass' ? 'daypass' : 'member'
    const endDate = calculateSubscriptionEndDate(tier)

    // For recurring subscriptions, create the subscription after authorization
    let subscriptionCode: string | undefined
    if (planType === 'member' && transaction.authorization?.authorization_code) {
      try {
        const planCode = metadata.plan_code
        const customerCode = metadata.customer_code

        if (planCode && customerCode) {
          // Create subscription with the authorization code
          const subscription = await paystackClient.initializeSubscription(
            customerCode,
            planCode,
            transaction.authorization.authorization_code
          )
          subscriptionCode = subscription.subscription_code
        }
      } catch (error: any) {
        console.error('Failed to create subscription:', error)
        // Continue anyway - the webhook will handle it
      }
    }

    // Update user subscription
    await updateUserSubscription({
      userId: user.id,
      tier,
      status: 'active',
      endDate,
      paystackTransactionRef: transactionRef,
      paystackSubscriptionCode: subscriptionCode,
    })

    // Redirect to comics page with success message
    return NextResponse.redirect(
      new URL(`/comics?success=true&plan=${encodeURIComponent(planName)}`, request.url)
    )
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.redirect(
      new URL('/subscription?error=verification_failed', request.url)
    )
  }
}
