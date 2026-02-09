'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { detectCountryClient } from '@/lib/geo-location'
import { getPlanDetails, formatPrice } from '@/lib/subscription-utils'

interface Plan {
  name: string
  description: string
  price: string
  period: string
  features: string[]
  limitations: string[]
  cta: string
  popular: boolean
  icon: typeof Crown
}

type SubscriptionProfileRow = {
  subscription_tier: string | null
  subscription_status: string | null
  subscription_end_date: string | null
}

function SubscriptionContent() {
  const [loading, setLoading] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [isDetectingCountry, setIsDetectingCountry] = useState(true)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free')
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const hasActiveSubscription =
    subscriptionStatus === 'active' &&
    // If end date is missing (provider-specific), treat as active to prevent re-subscribing
    (!subscriptionEndDate || new Date(subscriptionEndDate) > new Date())

  const hasActiveMemberSubscription = hasActiveSubscription && subscriptionTier === 'member'

  // Detect country and set prices on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        setIsDetectingCountry(true)
        const geoResult = await detectCountryClient()
        console.log('Detected country:', geoResult.countryCode)
        const isNigeria = geoResult.isNigeria

        // Get plan details based on country
        const memberPlan = getPlanDetails('Shattahs Member', isNigeria)
        const dayPassPlan = getPlanDetails('Day Pass', isNigeria)

        const updatedPlans: Plan[] = [
          {
            name: 'Shattahs Member',
            description: 'Become an Exclusive Shattahs Member',
            price: memberPlan ? formatPrice(memberPlan.amount, memberPlan.currency) : (isNigeria ? '₦2000' : '$1.99'),
            period: 'per week',
            features: [
              'Access to competition rewards',
              'Exclusive collector editions',
              'Behind-the-scenes content',
              'Early access to new releases',
              'Merchandise discounts',
              'Early beta features',
              'VIP community access',
            ],
            limitations: [],
            cta: 'Subscribe Now',
            popular: true,
            icon: Crown,
          },
          {
            name: 'Day Pass',
            description: 'Grab a Day Pass',
            price: dayPassPlan ? formatPrice(dayPassPlan.amount, dayPassPlan.currency) : (isNigeria ? '₦5000' : '$4.99'),
            period: 'One Time',
            features: [
              'Current comic unlocked',
              'No subscription',
              'No comment access',
              'No Exclusive Access',
              'No Early beta features',
              'No Merchandise discounts',
              'No Priority support',
            ],
            limitations: [],
            cta: 'Day Pass',
            popular: false,
            icon: Zap,
          },
        ]

        setPlans(updatedPlans)
      } catch (error) {
        console.error('Error detecting country:', error)
        // Default to Nigerian prices on error
        setPlans([
          {
            name: 'Shattahs Member',
            description: 'Become an Exclusive Shattahs Member',
            price: '₦2000',
            period: 'per week',
            features: [
              'Access to competition rewards',
              'Exclusive collector editions',
              'Behind-the-scenes content',
              'Early access to new releases',
              'Merchandise discounts',
              'Early beta features',
              'VIP community access',
            ],
            limitations: [],
            cta: 'Subscribe Now',
            popular: true,
            icon: Crown,
          },
          {
            name: 'Day Pass',
            description: 'Grab a Day Pass',
            price: '₦5000',
            period: 'One Time',
            features: [
              'Current comic unlocked',
              'No subscription',
              'No comment access',
              'No Exclusive Access',
              'No Early beta features',
              'No Merchandise discounts',
              'No Priority support',
            ],
            limitations: [],
            cta: 'Day Pass',
            popular: false,
            icon: Zap,
          },
        ])
      } finally {
        setIsDetectingCountry(false)
      }
    }

    detectCountry()
  }, [])

  // Fetch subscription status (if logged in) so we can disable re-subscribing
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setSubscriptionTier('free')
          setSubscriptionStatus('free')
          setSubscriptionEndDate(null)
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, subscription_end_date')
          .eq('id', user.id)
          .single()

        if (error) {
          throw error
        }

        const typedProfile = profile as unknown as SubscriptionProfileRow | null
        const tier = typedProfile?.subscription_tier ?? 'free'
        const status = typedProfile?.subscription_status ?? 'free'
        const endDate = typedProfile?.subscription_end_date ?? null

        setSubscriptionTier(tier)
        setSubscriptionStatus(status)
        setSubscriptionEndDate(endDate)
      } catch (error) {
        console.error('Error fetching subscription status:', error)
        // Fail open (allow user to subscribe) if we can't determine status
        setSubscriptionTier('free')
        setSubscriptionStatus('free')
        setSubscriptionEndDate(null)
      } finally {
        setIsCheckingSubscription(false)
      }
    }

    fetchSubscriptionStatus()
  }, [])

  useEffect(() => {
    // Handle success/error messages from URL params
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const plan = searchParams.get('plan')

    if (success === 'true') {
      toast.success(`Successfully subscribed to ${plan || 'plan'}!`)
      // Clean up URL
      router.replace('/subscription', { scroll: false })
    } else if (error) {
      const errorMessages: Record<string, string> = {
        no_reference: 'Payment reference not found. Please try again.',
        payment_failed: 'Payment failed. Please try again.',
        invalid_metadata: 'Invalid payment data. Please contact support.',
        verification_failed: 'Payment verification failed. Please contact support.',
      }
      toast.error(errorMessages[error] || 'An error occurred. Please try again.')
      // Clean up URL
      router.replace('/subscription', { scroll: false })
    }
  }, [searchParams, router])

  const handleSubscribe = async (planName: string) => {
    // Day Pass can be purchased without authentication - use anonymous endpoint
    if (planName === 'Day Pass') {
      // If user is logged in, prevent buying Day Pass while any active access exists
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_tier, subscription_status, subscription_end_date')
            .eq('id', user.id)
            .single()

          if (!profileError) {
            const typedProfile = profile as unknown as SubscriptionProfileRow | null
            const tier = typedProfile?.subscription_tier ?? 'free'
            const status = typedProfile?.subscription_status ?? 'free'
            const endDate = typedProfile?.subscription_end_date ?? null

            const isActive =
              status === 'active' && (!endDate || new Date(endDate) > new Date())

            // Keep UI state in sync with what we just checked
            setSubscriptionTier(tier)
            setSubscriptionStatus(status)
            setSubscriptionEndDate(endDate)
            setIsCheckingSubscription(false)

            if (isActive) {
              toast.info('You already have active access. Day Pass is not needed.')
              return
            }
          } else if (!isCheckingSubscription && hasActiveSubscription) {
            toast.info('You already have active access. Day Pass is not needed.')
            return
          }
        } else if (!isCheckingSubscription && hasActiveSubscription) {
          toast.info('You already have active access. Day Pass is not needed.')
          return
        }
      } catch (error) {
        console.error('Error checking subscription for Day Pass:', error)
        if (!isCheckingSubscription && hasActiveSubscription) {
          toast.info('You already have active access. Day Pass is not needed.')
          return
        }
      }

      handleDayPassPurchase()
      return
    }

    // Check if user is trying to subscribe to member subscription without being logged in
    if (planName === 'Shattahs Member') {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Redirect to login with toast message and redirect back to subscription page
          router.push('/login?message=Please sign in to subscribe to Shattahs Member&redirectTo=/subscription')
          return
        }

        // Prevent re-subscribing if user already has an active member subscription
        // (double-check on click to avoid any race with the initial background fetch)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, subscription_end_date')
          .eq('id', user.id)
          .single()

        if (!profileError) {
          const typedProfile = profile as unknown as SubscriptionProfileRow | null
          const tier = typedProfile?.subscription_tier ?? 'free'
          const status = typedProfile?.subscription_status ?? 'free'
          const endDate = typedProfile?.subscription_end_date ?? null

          const isActive =
            status === 'active' && (!endDate || new Date(endDate) > new Date())

          // Keep UI state in sync with what we just checked
          setSubscriptionTier(tier)
          setSubscriptionStatus(status)
          setSubscriptionEndDate(endDate)
          setIsCheckingSubscription(false)

          if (tier === 'member' && isActive) {
            toast.info('You already have an active Shattahs Member subscription.')
            return
          }
        } else if (!isCheckingSubscription && hasActiveMemberSubscription) {
          // Fallback to cached state if profile lookup failed
          toast.info('You already have an active Shattahs Member subscription.')
          return
        }
      } catch (error) {
        console.error('Error checking authentication:', error)
        // If there's an error checking auth, still redirect to login
        router.push('/login?message=Please sign in to subscribe to Shattahs Member&redirectTo=/subscription')
        return
      }
    }

    // Proceed with authenticated subscription
    handleSubscription(planName)
  }

  const handleDayPassPurchase = async () => {
    try {
      setLoading('Day Pass')

      const response = await fetch('/api/payments/initialize-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: 'Day Pass',
          redirectUrl: window.location.href,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to payment page (Paystack or PayPal)
      if (data.authorization_url) {
        // Paystack payment URL
        window.location.href = data.authorization_url
      } else if (data.approval_url) {
        // PayPal approval URL
        window.location.href = data.approval_url
      } else {
        throw new Error('No payment URL received')
      }
    } catch (error: unknown) {
      console.error('Day Pass purchase error:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to initialize Day Pass payment. Please try again.'
      toast.error(message)
      setLoading(null)
    }
  }

  const handleSubscription = async (planName: string) => {
    try {
      setLoading(planName)

      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to payment page (Paystack or PayPal)
      if (data.authorization_url) {
        // Paystack payment URL
        window.location.href = data.authorization_url
      } else if (data.approval_url) {
        // PayPal approval URL
        window.location.href = data.approval_url
      } else if (data.subscription_code) {
        // For subscriptions, Paystack will send an email
        // But we can also redirect if there's an authorization URL
        toast.info('Subscription initialized. Please check your email for payment instructions.')
        router.push('/profile')
      } else {
        throw new Error('No payment URL received')
      }
    } catch (error: unknown) {
      console.error('Subscription error:', error)
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to initialize payment. Please try again.'
      toast.error(message)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-16">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber/5 via-purple-500/5 to-transparent" />
        <div className="absolute -left-1/4 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[128px]" />
        <div className="absolute -right-1/4 bottom-0 h-96 w-96 rounded-full bg-purple-500/10 blur-[128px]" />
        
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="mb-4 bg-amber/10 text-amber border-amber/30">
            <Crown className="mr-1 h-3 w-3" />
            Subscription Plans
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Unlock the {' '}
            <span className="text-amber">Shattahsverse</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            All Power to the Artists! 
            Choose the plan that&apos;s right for you so we can continue to work with the best Art Talent around the Globe. Tired of waiting months for your favorite comics ? Grab a day pass or Subscribe and get unlimited access to premium comics,
            exclusive content, and more.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {isDetectingCountry && (
          <div className="flex justify-center mb-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber" />
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-8">
          {plans.length > 0 && plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col w-full max-w-sm ${
                plan.popular
                  ? 'border-amber/50 shadow-lg shadow-amber/10'
                  : 'border-border/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber text-background">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                  plan.popular ? 'bg-amber/20 text-amber' : 'bg-muted text-muted-foreground'
                }`}>
                  <plan.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-2 text-muted-foreground">
                      <span className="mt-0.5 h-4 w-4 flex-shrink-0 text-center">•</span>
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-amber hover:bg-amber-dark text-background'
                      : plan.name === 'Free'
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={
                    plan.name === 'Free' ||
                    loading === plan.name ||
                    (plan.name === 'Day Pass' && !isCheckingSubscription && hasActiveSubscription) ||
                    (plan.name === 'Shattahs Member' && !isCheckingSubscription && hasActiveMemberSubscription)
                  }
                  onClick={() => handleSubscribe(plan.name)}
                >
                  {loading === plan.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : plan.name === 'Day Pass' && !isCheckingSubscription && hasActiveSubscription ? (
                    'Already Active'
                  ) : plan.name === 'Shattahs Member' && !isCheckingSubscription && hasActiveMemberSubscription ? (
                    'Already Subscribed'
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {[
              {
                q: 'Can I cancel my subscription anytime?',
                a: 'Yes, you can cancel your subscription at any time. You will continue to have access until the end of your billing period.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards and bank transfers. Nigerian users can pay via Paystack, while international users can pay via PayPal.',
              },
              {
                q: 'Can I switch between plans?',
                a: 'Absolutely! You can upgrade or cancel your subscription at any time. Changes take effect on your next billing cycle.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-lg border border-border/50 bg-card/50 p-4"
              >
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Have questions?{' '}
            <Link href="/contact" className="text-amber hover:underline">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber" />
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  )
}
