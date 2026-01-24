e'use client'

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
import { Lock, LogIn, Crown, Sparkles } from 'lucide-react'

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

  const handleLogin = () => {
    const loginUrl = currentUrl
      ? `/login?redirectTo=${encodeURIComponent(currentUrl)}`
      : '/login'
    router.push(loginUrl)
  }

  const handleSubscribe = () => {
    router.push('/subscription')
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
              ? 'Unlock Full Access'
              : 'Sign In to Continue Reading'}
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
                    Get unlimited access to all comics
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Become a Shattahs Member to continue reading or grab a One Time Pass.
              </p>
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
            <Button
              onClick={handleLogin}
              className="w-full sm:w-auto bg-gradient-to-r from-amber to-amber/90 hover:from-amber/90 hover:to-amber text-background font-semibold px-8 py-6 text-lg shadow-lg shadow-amber/20"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
