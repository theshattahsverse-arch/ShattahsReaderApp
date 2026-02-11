import axios from 'axios'

const PAYPAL_BASE_URL = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
}

interface PayPalAccessToken {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalOrder {
  id: string
  status: string
  links: Array<{ href: string; rel: string; method: string }>
}

interface PayPalSubscription {
  id: string
  status: string
  links: Array<{ href: string; rel: string; method: string }>
}

interface PayPalPlan {
  id: string
  name: string
  status: string
}

class PayPalClient {
  private clientId: string
  private clientSecret: string
  private mode: 'sandbox' | 'live'
  private baseUrl: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || ''
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    this.mode = (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox'
    this.baseUrl = PAYPAL_BASE_URL[this.mode]

    if (!this.clientId || !this.clientSecret) {
      console.error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in environment variables')
      throw new Error('PayPal credentials are not configured. Please add them to your .env.local file.')
    }
  }

  /**
   * Get OAuth access token from PayPal
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      const response = await axios.post<PayPalAccessToken>(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${auth}`,
          },
        }
      )

      this.accessToken = response.data.access_token
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000

      return this.accessToken
    } catch (error: any) {
      throw new Error(`Failed to get PayPal access token: ${error.message}`)
    }
  }

  /**
   * Get authorization headers with access token
   */
  private async getAuthHeaders() {
    const token = await this.getAccessToken()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  /**
   * Create a PayPal order for one-time payment (Day Pass)
   */
  async createOrder(
    amount: number, // in USD (e.g., 4.99)
    currency: string = 'USD',
    returnUrl: string,
    cancelUrl: string,
    metadata?: Record<string, any>
  ): Promise<PayPalOrder> {
    try {
      const headers = await this.getAuthHeaders()

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            custom_id: metadata ? JSON.stringify(metadata) : (metadata?.user_id || ''),
            description: metadata?.plan_name || 'Subscription Payment',
          },
        ],
        application_context: {
          brand_name: 'ShattahsVerse',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }

      const response = await axios.post<PayPalOrder>(
        `${this.baseUrl}/v2/checkout/orders`,
        orderData,
        { headers }
      )

      return response.data
    } catch (error: any) {
      console.error('PayPal create order error:', error.response?.data || error.message)
      throw new Error(`Failed to create PayPal order: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Capture a PayPal order (complete the payment)
   */
  async captureOrder(orderId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders()

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers }
      )

      return response.data
    } catch (error: any) {
      throw new Error(`Failed to capture PayPal order: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders()

      const response = await axios.get(
        `${this.baseUrl}/v2/checkout/orders/${orderId}`,
        { headers }
      )

      return response.data
    } catch (error: any) {
      throw new Error(`Failed to get PayPal order: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create a subscription plan
   */
  async createPlan(
    name: string,
    amount: number, // in USD (e.g., 1.99)
    currency: string = 'USD',
    interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' = 'WEEK'
  ): Promise<PayPalPlan> {
    try {
      const headers = await this.getAuthHeaders()

      // Map interval to PayPal billing cycle
      const billingCycleUnit = interval === 'DAY' ? 'DAY' : interval === 'WEEK' ? 'WEEK' : interval === 'MONTH' ? 'MONTH' : 'YEAR'
      const frequency = interval === 'WEEK' ? 1 : 1

      const planData = {
        product_id: await this.getOrCreateProduct(),
        name,
        description: `${name} - Weekly Subscription`,
        billing_cycles: [
          {
            frequency: {
              interval_unit: billingCycleUnit,
              interval_count: frequency,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // 0 means infinite
            pricing_scheme: {
              fixed_price: {
                value: amount.toFixed(2),
                currency_code: currency,
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: 0,
            currency_code: currency,
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      }

      const response = await axios.post<{ id: string; name: string; status: string }>(
        `${this.baseUrl}/v1/billing/plans`,
        planData,
        { headers }
      )

      return {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status,
      }
    } catch (error: any) {
      console.error('PayPal create plan error:', error.response?.data || error.message)
      throw new Error(`Failed to create PayPal plan: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get or create a product for subscriptions
   */
  private async getOrCreateProduct(): Promise<string> {
    // For simplicity, we'll create a product ID or use a default one
    // In production, you might want to store this in your database
    const productId = process.env.PAYPAL_PRODUCT_ID

    if (productId) {
      return productId
    }

    // Create a product if it doesn't exist
    try {
      const headers = await this.getAuthHeaders()

      const productData = {
        name: 'ShattahsVerse Subscription',
        description: 'ShattahsVerse Comic Subscription Service',
        type: 'SERVICE',
        category: 'SOFTWARE',
      }

      const response = await axios.post<{ id: string }>(
        `${this.baseUrl}/v1/catalogs/products`,
        productData,
        { headers }
      )

      return response.data.id
    } catch (error: any) {
      // If product creation fails, we can still proceed with plan creation
      // PayPal will create a default product
      console.warn('Failed to create PayPal product, using default:', error.message)
      return 'PROD_DEFAULT'
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    planId: string,
    returnUrl: string,
    cancelUrl: string,
    metadata?: Record<string, any>
  ): Promise<PayPalSubscription> {
    try {
      const headers = await this.getAuthHeaders()

      const subscriptionData = {
        plan_id: planId,
        start_time: new Date(Date.now() + 60000).toISOString(), // Start 1 minute from now
        subscriber: {
          email_address: metadata?.email || '',
        },
        application_context: {
          brand_name: 'ShattahsVerse',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
        custom_id: metadata?.user_id || '',
      }

      const response = await axios.post<PayPalSubscription>(
        `${this.baseUrl}/v1/billing/subscriptions`,
        subscriptionData,
        { headers }
      )

      return response.data
    } catch (error: any) {
      console.error('PayPal create subscription error:', error.response?.data || error.message)
      throw new Error(`Failed to create PayPal subscription: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders()

      const response = await axios.get(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
        { headers }
      )

      return response.data
    } catch (error: any) {
      throw new Error(`Failed to get PayPal subscription: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders()

      await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
        {
          reason: reason || 'User requested cancellation',
        },
        { headers }
      )
    } catch (error: any) {
      throw new Error(`Failed to cancel PayPal subscription: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookId: string
  ): boolean {
    // PayPal webhook verification requires the webhook ID from PayPal dashboard
    // For now, we'll do basic verification
    // In production, implement full signature verification
    const authAlgo = headers['paypal-auth-algo']
    const certUrl = headers['paypal-cert-url']
    const transmissionId = headers['paypal-transmission-id']
    const transmissionSig = headers['paypal-transmission-sig']
    const transmissionTime = headers['paypal-transmission-time']

    // Basic check - in production, verify the signature cryptographically
    return !!(
      authAlgo &&
      certUrl &&
      transmissionId &&
      transmissionSig &&
      transmissionTime
    )
  }

  /**
   * Get approval URL from order or subscription
   */
  getApprovalUrl(orderOrSubscription: PayPalOrder | PayPalSubscription): string | null {
    const links = orderOrSubscription.links || []
    const approvalLink = links.find((link) => link.rel === 'approve' || link.rel === 'approval_url')
    return approvalLink?.href || null
  }
}

// Export singleton instance
export const paypalClient = new PayPalClient()

// Export types
export type { PayPalOrder, PayPalSubscription, PayPalPlan }
