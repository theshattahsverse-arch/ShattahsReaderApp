import { NextRequest, NextResponse } from 'next/server'
import { paystackClient } from '@/lib/paystack'
import { updateUserSubscription, calculateSubscriptionEndDate } from '@/lib/subscription-actions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Verify webhook signature
    const isValid = paystackClient.verifyWebhookSignature(body, signature)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const { event: eventType, data } = event

    console.log('Paystack webhook event:', eventType)

    // Handle different event types
    switch (eventType) {
      case 'charge.success':
        await handleChargeSuccess(data)
        break

      case 'subscription.create':
        await handleSubscriptionCreate(data)
        break

      case 'subscription.enable':
        await handleSubscriptionEnable(data)
        break

      case 'subscription.disable':
        await handleSubscriptionDisable(data)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(data)
        break

      default:
        console.log('Unhandled event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const metadata = data.metadata || {}
    const userId = metadata.user_id
    const planType = metadata.plan_type
    const planName = metadata.plan_name

    if (!userId) {
      console.error('No user_id in charge.success metadata')
      return
    }

    const supabase = await createClient()
    
    // Get user profile to check if this is a subscription renewal
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, paystack_subscription_code')
      .eq('id', userId)
      .single()

    if (profile?.paystack_subscription_code) {
      // This is a subscription renewal
      const tier = profile.subscription_tier === 'member' ? 'member' : 'daypass'
      const endDate = calculateSubscriptionEndDate(tier === 'member' ? 'member' : 'daypass')

      await updateUserSubscription({
        userId,
        tier: tier as 'member' | 'daypass',
        status: 'active',
        endDate,
        paystackTransactionRef: data.reference,
      })
    } else if (planType === 'daypass') {
      // One-time day pass payment
      const endDate = calculateSubscriptionEndDate('daypass')

      await updateUserSubscription({
        userId,
        tier: 'daypass',
        status: 'active',
        endDate,
        paystackTransactionRef: data.reference,
      })
    }
  } catch (error: any) {
    console.error('Error handling charge.success:', error)
  }
}

async function handleSubscriptionCreate(data: any) {
  try {
    const customer = data.customer
    const subscriptionCode = data.subscription_code
    const emailToken = data.email_token

    if (!customer || !subscriptionCode) {
      console.error('Missing customer or subscription_code in subscription.create')
      return
    }

    const supabase = await createClient()

    // Find user by Paystack customer code
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('paystack_customer_code', customer.customer_code)
      .single()

    if (!profile) {
      console.error('User not found for customer code:', customer.customer_code)
      return
    }

    // Update subscription
    const endDate = calculateSubscriptionEndDate('member')

    await updateUserSubscription({
      userId: profile.id,
      tier: 'member',
      status: 'active',
      endDate,
      paystackSubscriptionCode: subscriptionCode,
    })
  } catch (error: any) {
    console.error('Error handling subscription.create:', error)
  }
}

async function handleSubscriptionEnable(data: any) {
  try {
    const subscriptionCode = data.subscription_code

    const supabase = await createClient()

    // Find user by subscription code
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paystack_subscription_code', subscriptionCode)
      .single()

    if (!profile) {
      console.error('User not found for subscription code:', subscriptionCode)
      return
    }

    const tier = profile.subscription_tier === 'member' ? 'member' : 'daypass'
    const endDate = calculateSubscriptionEndDate(tier === 'member' ? 'member' : 'daypass')

    await updateUserSubscription({
      userId: profile.id,
      tier: tier as 'member' | 'daypass',
      status: 'active',
      endDate,
    })
  } catch (error: any) {
    console.error('Error handling subscription.enable:', error)
  }
}

async function handleSubscriptionDisable(data: any) {
  try {
    const subscriptionCode = data.subscription_code

    const supabase = await createClient()

    // Find user by subscription code
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paystack_subscription_code', subscriptionCode)
      .single()

    if (!profile) {
      console.error('User not found for subscription code:', subscriptionCode)
      return
    }

    // Set subscription to cancelled but keep access until end date
    await updateUserSubscription({
      userId: profile.id,
      tier: profile.subscription_tier as 'member' | 'daypass',
      status: 'cancelled',
    })
  } catch (error: any) {
    console.error('Error handling subscription.disable:', error)
  }
}

async function handlePaymentFailed(data: any) {
  try {
    const subscription = data.subscription
    if (!subscription) {
      return
    }

    const supabase = await createClient()

    // Find user by subscription code
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paystack_subscription_code', subscription.subscription_code)
      .single()

    if (!profile) {
      console.error('User not found for subscription code:', subscription.subscription_code)
      return
    }

    // You might want to notify the user or handle failed payment differently
    // For now, we'll just log it
    console.log('Payment failed for user:', profile.id)
  } catch (error: any) {
    console.error('Error handling payment.failed:', error)
  }
}
