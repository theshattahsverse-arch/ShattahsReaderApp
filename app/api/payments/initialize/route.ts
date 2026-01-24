import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackClient } from '@/lib/paystack'
import { paypalClient } from '@/lib/paypal'
import { detectUserCountry } from '@/lib/geo-location'
import { getPlanDetails, calculateSubscriptionEndDate } from '@/lib/subscription-actions'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Detect user country
    const geoResult = await detectUserCountry(request)
    const isNigeria = geoResult.isNigeria

    const body = await request.json()
    const { planName } = body

    if (!planName) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
    }

    // Get plan details based on country
    const planDetails = getPlanDetails(planName, isNigeria)
    if (!planDetails) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Route to appropriate payment provider
    if (isNigeria) {
      // Use Paystack for Nigerian users
      return await handlePaystackPayment(request, user, planName, planDetails)
    } else {
      // Use PayPal for international users
      return await handlePayPalPayment(request, user, planName, planDetails)
    }
  } catch (error: any) {
    console.error('Payment initialization error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}

async function handlePaystackPayment(
  request: NextRequest,
  user: any,
  planName: string,
  planDetails: any
) {
  // Check if Paystack secret key is configured
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not set')
    return NextResponse.json(
      { error: 'Payment service is not configured. Please contact support.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()

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
      return NextResponse.json(
        { 
          error: 'Failed to create subscription plan. Please try again.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }

    // Initialize a transaction to get authorization first
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
}

async function handlePayPalPayment(
  request: NextRequest,
  user: any,
  planName: string,
  planDetails: any
) {
  // Check if PayPal credentials are configured
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.error('PayPal credentials are not set')
    return NextResponse.json(
      { error: 'Payment service is not configured. Please contact support.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
  }

  const profileData = profile as any
  const userEmail = profileData?.email || user.email || ''

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const returnUrl = `${baseUrl}/api/payments/paypal/verify?plan=${encodeURIComponent(planName)}&userId=${user.id}`
  const cancelUrl = `${baseUrl}/subscription?error=payment_cancelled`

  // Handle different plan types
  if (planName === 'Day Pass') {
    // One-time payment - convert from cents to dollars
    const amountInDollars = planDetails.amount / 100
    const order = await paypalClient.createOrder(
      amountInDollars,
      'USD',
      returnUrl,
      cancelUrl,
      {
        user_id: user.id,
        plan_name: planName,
        plan_type: 'daypass',
      }
    )

    // Store order ID in database for later retrieval
    const updateData: Record<string, any> = { paypal_order_id: order.id }
    const { error: updateError } = await supabase
      .from('profiles')
      // @ts-expect-error - paypal_order_id field exists in database but types may not be updated
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to store PayPal order ID:', updateError)
    }

    const approvalUrl = paypalClient.getApprovalUrl(order)
    if (!approvalUrl) {
      return NextResponse.json({ error: 'Failed to get PayPal approval URL' }, { status: 500 })
    }

    return NextResponse.json({
      approval_url: approvalUrl,
      order_id: order.id,
    })
  } else if (planName === 'Shattahs Member') {
    // Recurring subscription
    const amountInDollars = planDetails.amount / 100
    const planNameForPayPal = `Shattahs Member Weekly - $${amountInDollars.toFixed(2)}`

    // Create subscription plan
    let paypalPlan
    try {
      paypalPlan = await paypalClient.createPlan(
        planNameForPayPal,
        amountInDollars,
        'USD',
        'WEEK'
      )
    } catch (error: any) {
      console.error('PayPal plan creation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create subscription plan. Please try again.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }

    // Create subscription
    const subscription = await paypalClient.createSubscription(
      paypalPlan.id,
      returnUrl,
      cancelUrl,
      {
        user_id: user.id,
        email: userEmail,
        plan_name: planName,
        plan_type: 'member',
      }
    )

    // Store subscription ID in database for later retrieval
    const updateData: Record<string, any> = { paypal_subscription_id: subscription.id }
    const { error: updateError } = await supabase
      .from('profiles')
      // @ts-expect-error - paypal_subscription_id field exists in database but types may not be updated
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to store PayPal subscription ID:', updateError)
    }

    const approvalUrl = paypalClient.getApprovalUrl(subscription)
    if (!approvalUrl) {
      return NextResponse.json({ error: 'Failed to get PayPal approval URL' }, { status: 500 })
    }

    return NextResponse.json({
      approval_url: approvalUrl,
      subscription_id: subscription.id,
      plan_id: paypalPlan.id,
    })
  }

  return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
}
