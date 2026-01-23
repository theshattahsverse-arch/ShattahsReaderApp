import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackClient } from '@/lib/paystack'
import { getPlanDetails, calculateSubscriptionEndDate } from '@/lib/subscription-actions'

export async function POST(request: NextRequest) {
  try {
    // Check if Paystack secret key is configured
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('PAYSTACK_SECRET_KEY is not set')
      return NextResponse.json(
        { error: 'Payment service is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planName } = body

    if (!planName) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
    }

    // Get plan details
    const planDetails = getPlanDetails(planName)
    if (!planDetails) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, paystack_customer_code')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Type assertion needed until TypeScript picks up updated database types
    const profileData = profile as any
    const userEmail = profileData?.email || user.email || ''
    const userName = profileData?.full_name || user.user_metadata?.full_name || ''

    // Create or get Paystack customer
    let customerCode = profileData?.paystack_customer_code
    if (!customerCode) {
      const customer = await paystackClient.createCustomer(
        userEmail,
        userName?.split(' ')[0] || undefined,
        userName?.split(' ').slice(1).join(' ') || undefined
      )
      customerCode = customer.customer_code

      // Save customer code to profile
      const updateData: Record<string, any> = { paystack_customer_code: customerCode }
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-expect-error - paystack_customer_code field exists in database but types may not be updated
        .update(updateData)
        .eq('id', user.id)
      
      if (updateError) {
        console.error('Failed to save customer code:', updateError)
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const callbackUrl = `${baseUrl}/api/payments/verify`

    // Handle different plan types
    if (planName === 'Day Pass') {
      // One-time payment
      const reference = `daypass_${user.id}_${Date.now()}`
      const transaction = await paystackClient.initializeTransaction(
        userEmail,
        planDetails.amount,
        reference,
        callbackUrl,
        {
          user_id: user.id,
          plan_name: planName,
          plan_type: 'daypass',
        }
      )

      return NextResponse.json({
        authorization_url: transaction.authorization_url,
        access_code: transaction.access_code,
        reference: transaction.reference,
      })
    } else if (planName === 'Shattahs Member') {
      // Recurring subscription
      // For Paystack subscriptions, we need to:
      // 1. Create a plan
      // 2. Initialize a transaction to get authorization
      // 3. After authorization, create subscription with that authorization code
      // For now, we'll initialize a transaction and handle subscription creation in the verify route
      
      const planNameForPaystack = `Shattahs Member Weekly - ₦${(planDetails.amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      
      // Create or get the plan
      let plan
      try {
        plan = await paystackClient.createPlan(
          planNameForPaystack,
          planDetails.amount,
          'weekly',
          'NGN'
        )
      } catch (error: any) {
        console.error('Plan creation error:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
        })
        return NextResponse.json(
          { 
            error: 'Failed to create subscription plan. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        )
      }

      // Initialize a transaction to get authorization first
      // This will allow the user to authorize recurring payments
      const reference = `subscription_${user.id}_${Date.now()}`
      const transaction = await paystackClient.initializeTransaction(
        userEmail,
        planDetails.amount, // First payment amount
        reference,
        callbackUrl,
        {
          user_id: user.id,
          plan_name: planName,
          plan_type: 'member',
          plan_code: plan.plan_code,
          customer_code: customerCode,
        }
      )

      return NextResponse.json({
        authorization_url: transaction.authorization_url,
        access_code: transaction.access_code,
        reference: transaction.reference,
        plan_code: plan.plan_code,
        customer_code: customerCode,
      })
    }

    return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
  } catch (error: any) {
    console.error('Payment initialization error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
