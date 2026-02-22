import { createClient } from '@/lib/supabase/server'

export type SubscriptionTier = 'free' | 'member' | 'daypass'
export type SubscriptionStatus = 'free' | 'active' | 'cancelled' | 'expired'

interface UpdateSubscriptionParams {
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  endDate?: Date
  paystackCustomerCode?: string
  paystackSubscriptionCode?: string
  paystackTransactionRef?: string
  paypalOrderId?: string
  paypalSubscriptionId?: string
  paymentProvider?: 'paystack' | 'paypal'
}

/**
 * Update user subscription in database
 */
export async function updateUserSubscription(params: UpdateSubscriptionParams) {
  const supabase = await createClient()

  const updateData: Record<string, any> = {
    subscription_tier: params.tier,
    subscription_status: params.status,
    subscription_end_date: params.endDate?.toISOString() || null,
    paystack_customer_code: params.paystackCustomerCode || null,
    paystack_subscription_code: params.paystackSubscriptionCode || null,
    paystack_transaction_ref: params.paystackTransactionRef || null,
    paypal_order_id: params.paypalOrderId || null,
    paypal_subscription_id: params.paypalSubscriptionId || null,
    payment_provider: params.paymentProvider || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('profiles')
    // @ts-ignore - subscription fields exist in database but types may not be updated
    .update(updateData as any)
    .eq('id', params.userId)

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`)
  }

  return { success: true }
}

/**
 * Get user subscription details
 */
export async function getUserSubscription(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, subscription_end_date, paystack_customer_code, paystack_subscription_code, paystack_transaction_ref, paypal_order_id, paypal_subscription_id, payment_provider')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to get subscription: ${error.message}`)
  }

  return data as any
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId)
    
    if (!subscription) {
      return false
    }

    // Check if subscription is active
    const subscriptionData = subscription as any
    if (subscriptionData.subscription_status !== 'active') {
      return false
    }

    // Check if subscription hasn't expired
    if (subscriptionData.subscription_end_date) {
      const endDate = new Date(subscriptionData.subscription_end_date)
      if (endDate < new Date()) {
        // Subscription expired, update status
        await updateUserSubscription({
          userId,
          tier: subscriptionData.subscription_tier as SubscriptionTier,
          status: 'expired',
        })
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error checking subscription:', error)
    return false
  }
}

/**
 * Calculate subscription end date based on plan
 */
export function calculateSubscriptionEndDate(planType: 'member' | 'daypass'): Date {
  const now = new Date()
  
  if (planType === 'daypass') {
    // Day pass expires after 3 hours
    return new Date(now.getTime() + 3 * 60 * 60 * 1000)
  } else if (planType === 'member') {
    // Weekly subscription - add 7 days
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  }
  
  return now
}

// Re-export client-safe utilities for server-side use
export { getPlanDetails, formatPrice } from '@/lib/subscription-utils'
