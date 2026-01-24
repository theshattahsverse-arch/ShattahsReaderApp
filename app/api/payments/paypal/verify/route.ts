import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paypalClient } from '@/lib/paypal'
import { updateUserSubscription, calculateSubscriptionEndDate } from '@/lib/subscription-actions'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const plan = searchParams.get('plan')
    const userId = searchParams.get('userId')
    const subscriptionId = searchParams.get('subscription_id') || searchParams.get('ba_token')
    const orderId = searchParams.get('order_id') || searchParams.get('token')

    // Verify userId matches authenticated user
    if (userId && userId !== user.id) {
      return NextResponse.redirect(
        new URL('/subscription?error=unauthorized', request.url)
      )
    }

    if (!plan) {
      return NextResponse.redirect(
        new URL('/subscription?error=invalid_metadata', request.url)
      )
    }

    // Determine subscription tier
    let tier: 'member' | 'daypass' = plan === 'Day Pass' ? 'daypass' : 'member'
    const endDate = calculateSubscriptionEndDate(tier)

    if (tier === 'daypass' && orderId) {
      // Handle one-time payment (Day Pass)
      try {
        // Capture the order to complete the payment
        const captureResult = await paypalClient.captureOrder(orderId)

        if (captureResult.status !== 'COMPLETED') {
          return NextResponse.redirect(
            new URL('/subscription?error=payment_failed', request.url)
          )
        }

        // Update user subscription
        await updateUserSubscription({
          userId: user.id,
          tier,
          status: 'active',
          endDate,
          paypalOrderId: orderId,
          paymentProvider: 'paypal',
        })

        return NextResponse.redirect(
          new URL(`/subscription?success=true&plan=${encodeURIComponent(plan)}`, request.url)
        )
      } catch (error: any) {
        console.error('PayPal order capture error:', error)
        return NextResponse.redirect(
          new URL('/subscription?error=verification_failed', request.url)
        )
      }
    } else if (tier === 'member' && subscriptionId) {
      // Handle recurring subscription (Member)
      try {
        // Get subscription details
        const subscription = await paypalClient.getSubscription(subscriptionId)

        if (subscription.status !== 'ACTIVE' && subscription.status !== 'APPROVAL_PENDING') {
          return NextResponse.redirect(
            new URL('/subscription?error=payment_failed', request.url)
          )
        }

        // Update user subscription
        await updateUserSubscription({
          userId: user.id,
          tier,
          status: subscription.status === 'ACTIVE' ? 'active' : 'active', // Treat APPROVAL_PENDING as active
          endDate,
          paypalSubscriptionId: subscriptionId,
          paymentProvider: 'paypal',
        })

        // If subscription is still pending approval, inform user
        if (subscription.status === 'APPROVAL_PENDING') {
          return NextResponse.redirect(
            new URL(`/subscription?success=true&plan=${encodeURIComponent(plan)}&pending=true`, request.url)
          )
        }

        return NextResponse.redirect(
          new URL(`/subscription?success=true&plan=${encodeURIComponent(plan)}`, request.url)
        )
      } catch (error: any) {
        console.error('PayPal subscription verification error:', error)
        return NextResponse.redirect(
          new URL('/subscription?error=verification_failed', request.url)
        )
      }
    } else if (token) {
      // Handle token-based approval (alternative flow)
      // PayPal sometimes returns just a token
      try {
        // Try to get order or subscription from token
        // This is a simplified flow - in production, you might need to store the order/subscription ID
        // when creating it and retrieve it here using the token
        
        // For now, we'll redirect with an info message
        // The webhook will handle the actual subscription update
        return NextResponse.redirect(
          new URL(`/subscription?success=true&plan=${encodeURIComponent(plan)}&pending=true`, request.url)
        )
      } catch (error: any) {
        console.error('PayPal token verification error:', error)
        return NextResponse.redirect(
          new URL('/subscription?error=verification_failed', request.url)
        )
      }
    } else {
      return NextResponse.redirect(
        new URL('/subscription?error=no_reference', request.url)
      )
    }
  } catch (error: any) {
    console.error('PayPal verification error:', error)
    return NextResponse.redirect(
      new URL('/subscription?error=verification_failed', request.url)
    )
  }
}
