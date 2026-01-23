# Paystack Subscription Integration Setup

This document outlines the setup required for the Paystack subscription integration.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Paystack Keys
PAYSTACK_SECRET_KEY=sk_test_...  # Your Paystack secret key
PAYSTACK_PUBLIC_KEY=pk_test_...  # Your Paystack public key (optional, for future frontend use)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...  # Public key for client-side (optional)

# Application URL (for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3002  # Your app URL
```

## Database Setup

Run the updated schema in your Supabase SQL Editor. The schema has been updated to include:
- `subscription_status` - Status of the subscription (free, active, cancelled, expired)
- `paystack_customer_code` - Paystack customer identifier
- `paystack_subscription_code` - Paystack subscription identifier (for recurring subscriptions)
- `paystack_transaction_ref` - Last transaction reference

## Paystack Webhook Configuration

1. Go to your Paystack Dashboard
2. Navigate to Settings > API Keys & Webhooks
3. Add a webhook URL: `https://yourdomain.com/api/payments/webhook`
4. For local development, use a tool like ngrok to expose your local server:
   ```bash
   ngrok http 3002
   ```
   Then use the ngrok URL: `https://your-ngrok-url.ngrok.io/api/payments/webhook`

## Testing

### Test Cards (Paystack Test Mode)

Use these test cards for testing:

- **Success**: `4084084084084081`
- **Declined**: `5060666666666666666`
- **Insufficient Funds**: `5060666666666666667`

Use any CVV, any future expiry date, and any PIN.

### Test Flow

1. Navigate to `/subscription`
2. Click on a plan (Shattahs Member or Day Pass)
3. You'll be redirected to Paystack's payment page
4. Use a test card to complete payment
5. You'll be redirected back to the subscription page with a success message
6. Check your profile page to see subscription status

## Features Implemented

### One-Time Payments (Day Pass)
- $4.99 one-time payment
- 24-hour access
- Payment verification via redirect callback

### Recurring Subscriptions (Shattahs Member)
- $1.99/week recurring subscription
- Automatic weekly billing
- Subscription management via Paystack
- Webhook handling for subscription events

### Webhook Events Handled
- `charge.success` - Payment successful
- `subscription.create` - Subscription created
- `subscription.enable` - Subscription enabled
- `subscription.disable` - Subscription cancelled
- `invoice.payment_failed` - Payment failed

## API Routes

- `POST /api/payments/initialize` - Initialize payment/subscription
- `GET /api/payments/verify` - Verify payment after redirect
- `POST /api/payments/webhook` - Handle Paystack webhooks

## Notes

- All amounts are in cents (199 = $1.99, 499 = $4.99)
- Currency is set to USD
- Subscription plans are created automatically on first use
- Customer codes are stored in the database for future transactions
- Webhook signature verification is implemented for security
