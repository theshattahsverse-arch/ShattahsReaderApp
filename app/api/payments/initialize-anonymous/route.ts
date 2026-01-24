import { NextRequest, NextResponse } from 'next/server'
import { paystackClient } from '@/lib/paystack'
import { paypalClient } from '@/lib/paypal'
import { detectUserCountry } from '@/lib/geo-location'
import { getPlanDetails } from '@/lib/subscription-actions'
import { generateSessionId, setSessionIdCookie } from '@/lib/anonymous-daypass'

export async function POST(request: NextRequest) {
  try {
    // Detect user country
    const geoResult = await detectUserCountry(request)
    const isNigeria = geoResult.isNigeria

    const body = await request.json()
    const { planName, redirectUrl } = body

    if (!planName || planName !== 'Day Pass') {
      return NextResponse.json({ error: 'Only Day Pass is available for anonymous purchase' }, { status: 400 })
    }

    // Get plan details based on country
    const planDetails = getPlanDetails(planName, isNigeria)
    if (!planDetails) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Generate session ID for anonymous user
    const sessionId = generateSessionId()

    // Route to appropriate payment provider
    let response: NextResponse
    if (isNigeria) {
      // Use Paystack for Nigerian users
      response = await handlePaystackPayment(request, sessionId, planName, planDetails, redirectUrl)
    } else {
      // Use PayPal for international users
      response = await handlePayPalPayment(request, sessionId, planName, planDetails, redirectUrl)
    }

    // Set session ID cookie in response
    setSessionIdCookie(sessionId, response)

    return response
  } catch (error: any) {
    console.error('Anonymous payment initialization error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}

async function handlePaystackPayment(
  request: NextRequest,
  sessionId: string,
  planName: string,
  planDetails: any,
  redirectUrl?: string
) {
  // Check if Paystack secret key is configured
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not set')
    return NextResponse.json(
      { error: 'Payment service is not configured. Please contact support.' },
      { status: 500 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const callbackUrl = `${baseUrl}/api/payments/verify`

  // One-time payment for Day Pass
  const reference = `daypass_anonymous_${sessionId}_${Date.now()}`
  
  // Use a placeholder email for anonymous users
  // Paystack requires an email, but we'll track by session_id in metadata
  const anonymousEmail = `anonymous_${sessionId}@shattahsverse.com`
  
  const transaction = await paystackClient.initializeTransaction(
    anonymousEmail,
    planDetails.amount,
    reference,
    callbackUrl,
    {
      session_id: sessionId,
      plan_name: planName,
      plan_type: 'daypass',
      is_anonymous: 'true',
      redirect_url: redirectUrl || '',
    }
  )

  return NextResponse.json({
    authorization_url: transaction.authorization_url,
    access_code: transaction.access_code,
    reference: transaction.reference,
  })
}

async function handlePayPalPayment(
  request: NextRequest,
  sessionId: string,
  planName: string,
  planDetails: any,
  redirectUrl?: string
) {
  // Check if PayPal credentials are configured
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.error('PayPal credentials are not set')
    return NextResponse.json(
      { error: 'Payment service is not configured. Please contact support.' },
      { status: 500 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const redirectParam = redirectUrl ? `&redirect_url=${encodeURIComponent(redirectUrl)}` : ''
  const returnUrl = `${baseUrl}/api/payments/paypal/verify?plan=${encodeURIComponent(planName)}&sessionId=${sessionId}${redirectParam}`
  const cancelUrl = `${baseUrl}/subscription?error=payment_cancelled`

  // One-time payment - convert from cents to dollars
  const amountInDollars = planDetails.amount / 100
  const order = await paypalClient.createOrder(
    amountInDollars,
    'USD',
    returnUrl,
    cancelUrl,
    {
      session_id: sessionId,
      plan_name: planName,
      plan_type: 'daypass',
      is_anonymous: 'true',
    }
  )

  const approvalUrl = paypalClient.getApprovalUrl(order)
  if (!approvalUrl) {
    return NextResponse.json({ error: 'Failed to get PayPal approval URL' }, { status: 500 })
  }

  return NextResponse.json({
    approval_url: approvalUrl,
    order_id: order.id,
  })
}
