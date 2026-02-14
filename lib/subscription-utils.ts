/**
 * Client-safe utility functions for subscription pricing
 * These functions don't import any server-side code and can be used in client components
 */

export type SubscriptionTier = 'free' | 'member' | 'daypass'

/**
 * Get plan details based on country
 * @param planName - Name of the plan
 * @param isNigeria - Whether user is from Nigeria (default: true for backward compatibility)
 * @returns Plan details with amount in smallest currency unit (kobo for NGN, cents for USD)
 */
export function getPlanDetails(planName: string, isNigeria: boolean = true) {
  if (isNigeria) {
    // Nigerian prices in kobo (smallest NGN unit)
    const plans: Record<string, { amount: number; tier: SubscriptionTier; interval?: string; currency: string }> = {
      'Shattahs Member': {
        amount: 100000, // ₦1,000 in kobo (1000 * 100)
        tier: 'member',
        interval: 'weekly',
        currency: 'NGN',
      },
      'Day Pass': {
        amount: 500000, // ₦5,000 in kobo (5000 * 100)
        tier: 'daypass',
        currency: 'NGN',
      },
    }
    return plans[planName] || null
  } else {
    // International prices in USD cents (smallest USD unit)
    const plans: Record<string, { amount: number; tier: SubscriptionTier; interval?: string; currency: string }> = {
      'Shattahs Member': {
        amount: 199, // $1.99 in cents (1.99 * 100)
        tier: 'member',
        interval: 'weekly',
        currency: 'USD',
      },
      'Day Pass': {
        amount: 499, // $4.99 in cents (4.99 * 100)
        tier: 'daypass',
        currency: 'USD',
      },
    }
    return plans[planName] || null
  }
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string): string {
  if (currency === 'NGN') {
    // Convert from kobo to Naira
    const naira = amount / 100
    return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  } else if (currency === 'USD') {
    // Convert from cents to dollars
    const dollars = amount / 100
    return `$${dollars.toFixed(2)}`
  }
  return `${amount}`
}
