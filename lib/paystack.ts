import axios from 'axios'
import crypto from 'crypto'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

interface PaystackResponse<T> {
  status: boolean
  message: string
  data: T
}

interface Customer {
  id: number
  customer_code: string
  email: string
  first_name: string | null
  last_name: string | null
}

interface Plan {
  id: number
  name: string
  plan_code: string
  amount: number
  interval: string
  currency: string
}

interface Transaction {
  id: number
  reference: string
  amount: number
  status: string
  authorization_url?: string
  access_code?: string
}

interface Subscription {
  id: number
  subscription_code: string
  email_token: string
  customer: number
  plan: number
  status: string
  authorization: {
    authorization_code: string
    bin: string
    last4: string
    exp_month: string
    exp_year: string
    channel: string
    card_type: string
    bank: string
    country_code: string
    brand: string
    reusable: boolean
    signature: string
    account_name: string | null
  }
}

class PaystackClient {
  private secretKey: string

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || ''
    if (!this.secretKey) {
      console.error('PAYSTACK_SECRET_KEY is not set in environment variables')
      throw new Error('PAYSTACK_SECRET_KEY is not set. Please add it to your .env.local file.')
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Create or get a Paystack customer
   */
  async createCustomer(email: string, firstName?: string, lastName?: string): Promise<Customer> {
    try {
      const response = await axios.post<PaystackResponse<Customer>>(
        `${PAYSTACK_BASE_URL}/customer`,
        {
          email,
          first_name: firstName,
          last_name: lastName,
        },
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.message?.includes('already exists')) {
        // Customer already exists, fetch it
        const customers = await this.getCustomerByEmail(email)
        if (customers.length > 0) {
          return customers[0]
        }
      }
      throw new Error(`Failed to create customer: ${error.message}`)
    }
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<Customer[]> {
    try {
      const response = await axios.get<PaystackResponse<Customer[]>>(
        `${PAYSTACK_BASE_URL}/customer?email=${encodeURIComponent(email)}`,
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      throw new Error(`Failed to get customer: ${error.message}`)
    }
  }

  /**
   * List all plans
   */
  async listPlans(): Promise<Plan[]> {
    try {
      const response = await axios.get<PaystackResponse<Plan[]>>(
        `${PAYSTACK_BASE_URL}/plan`,
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      // Paystack returns data as an array or object with data property
      const plans = Array.isArray(response.data.data) 
        ? response.data.data 
        : (response.data.data as any)?.data || []
      
      return plans
    } catch (error: any) {
      // If it's a 401 or 403, the API key might be invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid Paystack API key. Please check your PAYSTACK_SECRET_KEY.')
      }
      throw new Error(`Failed to list plans: ${error.message}`)
    }
  }

  /**
   * Find a plan by name, amount, and interval
   */
  async findPlan(
    name: string,
    amount: number,
    interval: string,
    currency: string = 'NGN'
  ): Promise<Plan | null> {
    try {
      const plans = await this.listPlans()
      const plan = plans.find(
        (p) =>
          p.name === name &&
          p.amount === amount &&
          p.interval === interval &&
          p.currency === currency
      )
      return plan || null
    } catch (error: any) {
      console.error('Error finding plan:', error)
      return null
    }
  }

  /**
   * Create a subscription plan (or return existing if found)
   */
  async createPlan(
    name: string,
    amount: number, // in kobo (smallest NGN unit)
    interval: 'daily' | 'weekly' | 'monthly' | 'annually',
    currency: string = 'NGN'
  ): Promise<Plan> {
    try {
      // First, try to find existing plan
      const existingPlan = await this.findPlan(name, amount, interval, currency)
      if (existingPlan) {
        console.log('Found existing plan:', existingPlan.plan_code)
        return existingPlan
      }

      // If not found, create new plan
      const response = await axios.post<PaystackResponse<Plan>>(
        `${PAYSTACK_BASE_URL}/plan`,
        {
          name,
          amount,
          interval,
          currency,
        },
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        // If plan creation fails, it might be a duplicate
        // Try to find it again
        const foundPlan = await this.findPlan(name, amount, interval, currency)
        if (foundPlan) {
          return foundPlan
        }
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      // If error is about duplicate or already exists, try to find existing plan
      const errorMessage = error.response?.data?.message?.toLowerCase() || error.message?.toLowerCase() || ''
      if (errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate') ||
          error.response?.status === 409) {
        console.log('Plan might already exist, searching for it...')
        const foundPlan = await this.findPlan(name, amount, interval, currency)
        if (foundPlan) {
          console.log('Found existing plan after error:', foundPlan.plan_code)
          return foundPlan
        }
      }
      
      // If it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid Paystack API key. Please check your PAYSTACK_SECRET_KEY.')
      }
      
      console.error('Plan creation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      
      throw new Error(`Failed to create plan: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Initialize a transaction (for one-time payments)
   */
  async initializeTransaction(
    email: string,
    amount: number, // in cents
    reference?: string,
    callbackUrl?: string,
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    try {
      const response = await axios.post<PaystackResponse<Transaction>>(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email,
          amount,
          reference,
          callback_url: callbackUrl,
          metadata,
        },
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      throw new Error(`Failed to initialize transaction: ${error.message}`)
    }
  }

  /**
   * Initialize a subscription
   */
  async initializeSubscription(
    customer: string, // customer code or email
    plan: string, // plan code
    authorizationCode?: string
  ): Promise<Subscription> {
    try {
      const payload: any = {
        customer,
        plan,
      }

      if (authorizationCode) {
        payload.authorization = authorizationCode
      }

      const response = await axios.post<PaystackResponse<Subscription>>(
        `${PAYSTACK_BASE_URL}/subscription`,
        payload,
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      throw new Error(`Failed to initialize subscription: ${error.message}`)
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await axios.get<PaystackResponse<any>>(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      throw new Error(`Failed to verify transaction: ${error.message}`)
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex')
    return hash === signature
  }

  /**
   * Disable a subscription
   */
  async disableSubscription(subscriptionCode: string, emailToken: string): Promise<any> {
    try {
      const response = await axios.post<PaystackResponse<any>>(
        `${PAYSTACK_BASE_URL}/subscription/disable`,
        {
          code: subscriptionCode,
          token: emailToken,
        },
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      throw new Error(`Failed to disable subscription: ${error.message}`)
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionCode: string): Promise<Subscription> {
    try {
      const response = await axios.get<PaystackResponse<Subscription>>(
        `${PAYSTACK_BASE_URL}/subscription/${subscriptionCode}`,
        { headers: this.getHeaders() }
      )

      if (!response.data.status) {
        throw new Error(response.data.message)
      }

      return response.data.data
    } catch (error: any) {
      throw new Error(`Failed to get subscription: ${error.message}`)
    }
  }
}

// Export singleton instance
export const paystackClient = new PaystackClient()

// Export types
export type { Customer, Plan, Transaction, Subscription }
