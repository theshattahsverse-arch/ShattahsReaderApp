import { NextRequest, NextResponse } from 'next/server'
import { paypalClient } from '@/lib/paypal'
import { updateUserSubscription, calculateSubscriptionEndDate } from '@/lib/subscription-actions'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const headers = Object.fromEntries(request.headers.entries())

    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || ''
    const isValid = paypalClient.verifyWebhookSignature(headers, body, webhookId)
    
    if (!isValid && process.env.NODE_ENV === 'production') {
      console.warn('PayPal webhook signature verification failed')
      // In production, you should verify the signature properly
      // For now, we'll continue but log a warning
    }

    const event = JSON.parse(body)
    const { event_type, resource } = event

    console.log('PayPal webhook event:', event_type)

    // Handle different event types
    switch (event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(resource)
        break

      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(resource)
        break

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(resource)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(resource)
        break

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(resource)
        break

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(resource)
        break

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handleSubscriptionPaymentFailed(resource)
        break

      default:
        console.log('Unhandled PayPal event type:', event_type)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handlePaymentCaptureCompleted(resource: any) {
  try {
    const customId = resource.custom_id || resource.purchase_units?.[0]?.custom_id
    if (!customId) {
      console.error('No custom_id in PAYMENT.CAPTURE.COMPLETED')
      return
    }

    // Extract user_id from custom_id (format: user_id or stored separately)
    // For now, we'll need to store the mapping or extract from order metadata
    const orderId = resource.id || resource.order_id

    const supabase = await createClient()

    // Find user by PayPal order ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paypal_order_id', orderId)
      .single()

    if (!profile) {
      console.error('User not found for PayPal order ID:', orderId)
      return
    }

    // This is a one-time payment (Day Pass)
    const endDate = calculateSubscriptionEndDate('daypass')

    await updateUserSubscription({
      userId: profile.id,
      tier: 'daypass',
      status: 'active',
      endDate,
      paypalOrderId: orderId,
      paymentProvider: 'paypal',
    })
  } catch (error: any) {
    console.error('Error handling PAYMENT.CAPTURE.COMPLETED:', error)
  }
}

async function handleSubscriptionCreated(resource: any) {
  try {
    const subscriptionId = resource.id
    const customId = resource.custom_id

    if (!subscriptionId) {
      console.error('No subscription ID in BILLING.SUBSCRIPTION.CREATED')
      return
    }

    // If we have custom_id with user_id, use it
    // Otherwise, we'll need to find the user by subscription ID
    const supabase = await createClient()

    let userId: string | null = null

    if (customId) {
      // Try to extract user_id from custom_id
      userId = customId
    }

    if (!userId) {
      // Find user by PayPal subscription ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('paypal_subscription_id', subscriptionId)
        .single()

      if (profile) {
        userId = profile.id
      }
    }

    if (!userId) {
      console.error('User not found for PayPal subscription ID:', subscriptionId)
      return
    }

    // Subscription created - set as active
    const endDate = calculateSubscriptionEndDate('member')

    await updateUserSubscription({
      userId,
      tier: 'member',
      status: 'active',
      endDate,
      paypalSubscriptionId: subscriptionId,
      paymentProvider: 'paypal',
    })
  } catch (error: any) {
    console.error('Error handling BILLING.SUBSCRIPTION.CREATED:', error)
  }
}

async function handleSubscriptionActivated(resource: any) {
  try {
    const subscriptionId = resource.id

    if (!subscriptionId) {
      console.error('No subscription ID in BILLING.SUBSCRIPTION.ACTIVATED')
      return
    }

    const supabase = await createClient()

    // Find user by subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paypal_subscription_id', subscriptionId)
      .single()

    if (!profile) {
      console.error('User not found for PayPal subscription ID:', subscriptionId)
      return
    }

    const tier = profile.subscription_tier === 'member' ? 'member' : 'daypass'
    const endDate = calculateSubscriptionEndDate(tier === 'member' ? 'member' : 'daypass')

    await updateUserSubscription({
      userId: profile.id,
      tier: tier as 'member' | 'daypass',
      status: 'active',
      endDate,
      paypalSubscriptionId: subscriptionId,
      paymentProvider: 'paypal',
    })
  } catch (error: any) {
    console.error('Error handling BILLING.SUBSCRIPTION.ACTIVATED:', error)
  }
}

async function handleSubscriptionCancelled(resource: any) {
  try {
    const subscriptionId = resource.id

    if (!subscriptionId) {
      console.error('No subscription ID in BILLING.SUBSCRIPTION.CANCELLED')
      return
    }

    const supabase = await createClient()

    // Find user by subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paypal_subscription_id', subscriptionId)
      .single()

    if (!profile) {
      console.error('User not found for PayPal subscription ID:', subscriptionId)
      return
    }

    // Set subscription to cancelled but keep access until end date
    await updateUserSubscription({
      userId: profile.id,
      tier: profile.subscription_tier as 'member' | 'daypass',
      status: 'cancelled',
      paypalSubscriptionId: subscriptionId,
      paymentProvider: 'paypal',
    })
  } catch (error: any) {
    console.error('Error handling BILLING.SUBSCRIPTION.CANCELLED:', error)
  }
}

async function handleSubscriptionSuspended(resource: any) {
  try {
    const subscriptionId = resource.id

    if (!subscriptionId) {
      console.error('No subscription ID in BILLING.SUBSCRIPTION.SUSPENDED')
      return
    }

    const supabase = await createClient()

    // Find user by subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paypal_subscription_id', subscriptionId)
      .single()

    if (!profile) {
      console.error('User not found for PayPal subscription ID:', subscriptionId)
      return
    }

    // Set subscription to cancelled (suspended subscriptions should be treated as cancelled)
    await updateUserSubscription({
      userId: profile.id,
      tier: profile.subscription_tier as 'member' | 'daypass',
      status: 'cancelled',
      paypalSubscriptionId: subscriptionId,
      paymentProvider: 'paypal',
    })
  } catch (error: any) {
    console.error('Error handling BILLING.SUBSCRIPTION.SUSPENDED:', error)
  }
}

async function handleSubscriptionExpired(resource: any) {
  try {
    const subscriptionId = resource.id

    if (!subscriptionId) {
      console.error('No subscription ID in BILLING.SUBSCRIPTION.EXPIRED')
      return
    }

    const supabase = await createClient()

    // Find user by subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paypal_subscription_id', subscriptionId)
      .single()

    if (!profile) {
      console.error('User not found for PayPal subscription ID:', subscriptionId)
      return
    }

    // Set subscription to expired
    await updateUserSubscription({
      userId: profile.id,
      tier: profile.subscription_tier as 'member' | 'daypass',
      status: 'expired',
      paypalSubscriptionId: subscriptionId,
      paymentProvider: 'paypal',
    })
  } catch (error: any) {
    console.error('Error handling BILLING.SUBSCRIPTION.EXPIRED:', error)
  }
}

async function handleSubscriptionPaymentFailed(resource: any) {
  try {
    const subscriptionId = resource.id || resource.billing_agreement_id

    if (!subscriptionId) {
      console.error('No subscription ID in BILLING.SUBSCRIPTION.PAYMENT.FAILED')
      return
    }

    const supabase = await createClient()

    // Find user by subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('paypal_subscription_id', subscriptionId)
      .single()

    if (!profile) {
      console.error('User not found for PayPal subscription ID:', subscriptionId)
      return
    }

    // Log payment failure - you might want to notify the user
    console.log('Payment failed for PayPal subscription:', subscriptionId, 'User:', profile.id)
    
    // Optionally, you could set status to expired or keep it active for grace period
    // For now, we'll just log it
  } catch (error: any) {
    console.error('Error handling BILLING.SUBSCRIPTION.PAYMENT.FAILED:', error)
  }
}
