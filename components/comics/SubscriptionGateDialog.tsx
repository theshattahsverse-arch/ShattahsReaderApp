'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Lock, LogIn, Crown, Sparkles, Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated: boolean
  hasActiveSubscription: boolean
  currentUrl?: string
}

export function SubscriptionGateDialog({
  open,
  onOpenChange,
  isAuthenticated,
  hasActiveSubscription,
  currentUrl,
}: SubscriptionGateDialogProps) {
  const router = useRouter()
  const [isLoadingDayPass, setIsLoadingDayPass] = useState(false)

  const handleLogin = () => {
    const loginUrl = currentUrl
      ? `/login?redirectTo=${encodeURIComponent(currentUrl)}`
      : '/login'
    router.push(loginUrl)
  }

  const handleSubscribe = () => {
    router.push('/subscription')
  }

  const handleDayPassPurchase = async () => {
    try {
      setIsLoadingDayPass(true)
      
      const response = await fetch('/api/payments/initialize-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: 'Day Pass',
          redirectUrl: currentUrl || window.location.href,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to initialize payment')
      }

      const data = await response.json()
      
      // Redirect to payment URL
      if (data.authorization_url) {
        // Paystack
        window.location.href = data.authorization_url
      } else if (data.approval_url) {
        // PayPal
        window.location.href = data.approval_url
      } else {
        throw new Error('No payment URL received')
      }
    } catch (error: any) {
      console.error('Day Pass purchase error:', error)
      toast.error(error.message || 'Failed to initialize Day Pass payment')
      setIsLoadingDayPass(false)
    }
  }

  // Determine what to show based on authentication and subscription status
  const showSubscribe = isAuthenticated && !hasActiveSubscription
  const showLogin = !isAuthenticated

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-amber/20 bg-gradient-to-br from-background to-background/95">
        <DialogHeader>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber/20 to-amber/10 border-2 border-amber/30">
            {showSubscribe ? (
              <Crown className="h-8 w-8 text-amber" />
            ) : (
              <Lock className="h-8 w-8 text-amber" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            {showSubscribe
              ? 'Become a Shattahs Member for exclusive Access'
              : 'Join the Shattahsverse'}
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            {showSubscribe ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Subscribe to access all pages and unlock exclusive content.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Sparkles className="h-4 w-4 text-amber" />
                  <span className="text-sm font-medium text-amber">
                    Get unlimited access to all exclusive Shattahs content.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Become a Shattahs member! Sign in to continue reading.
                </p>
                <p className="text-sm text-muted-foreground">
                  Or get a One Time Day Pass to access the remaining pages.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-center mt-4">
          {showSubscribe ? (
            <Button
              onClick={handleSubscribe}
              className="w-full sm:w-auto bg-gradient-to-r from-amber to-amber/90 hover:from-amber/90 hover:to-amber text-background font-semibold px-8 py-6 text-lg shadow-lg shadow-amber/20"
            >
              <Crown className="mr-2 h-5 w-5" />
              Subscribe Now
            </Button>
          ) : showLogin ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={handleDayPassPurchase}
                disabled={isLoadingDayPass}
                className="w-full sm:w-auto bg-gradient-to-r from-amber to-amber/90 hover:from-amber/90 hover:to-amber text-background font-semibold px-8 py-6 text-lg shadow-lg shadow-amber/20"
              >
                {isLoadingDayPass ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Day Pass
                  </>
                )}
              </Button>
              <Button
                onClick={handleLogin}
                variant="outline"
                className="w-full sm:w-auto border-amber/30 text-amber hover:bg-amber/10 font-semibold px-8 py-6 text-lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Sign In
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
