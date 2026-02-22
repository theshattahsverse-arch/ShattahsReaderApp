import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Crown, 
  BookOpen, 
  Calendar,
  LogOut
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { SignOutButton } from '@/components/auth/SignOutButton'

export const metadata = {
  title: 'Profile',
  description: 'Manage your ShattahsVerse profile',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile data from database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const subscriptionTier = profile?.subscription_tier || 'free'
  const subscriptionStatus = profile?.subscription_status || 'free'
  const subscriptionEndDate = profile?.subscription_end_date
  const hasActiveSubscription = subscriptionStatus === 'active' && subscriptionEndDate && new Date(subscriptionEndDate) > new Date()

  // Mock reading history - in production, fetch from user_reading_progress table
  const readingHistory = [
    { title: 'Shatteus: Issue 0', progress: '100%', lastRead: '2025-12-20' },
    { title: 'Neon Shadows', progress: '45%', lastRead: '2025-12-18' },
  ]

  const getSubscriptionDisplayName = (tier: string) => {
    switch (tier) {
      case 'member':
        return 'Shattahs Member'
      case 'daypass':
        return 'Day Pass'
      default:
        return 'Free'
    }
  }

  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Active</Badge>
      case 'cancelled':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Cancelled</Badge>
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Expired</Badge>
      default:
        return <Badge variant="outline">Free</Badge>
    }
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        {/* Profile Overview */}
        <div className="mb-8 rounded-xl border border-border/50 bg-card/50 p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Avatar className="h-20 w-20 border-4 border-amber/30">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-amber text-background text-2xl font-bold">
                {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold">
                {user.user_metadata?.full_name || 'Hero'}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className="bg-amber/10 text-amber border-amber/30">
                  <Crown className="mr-1 h-3 w-3" />
                  {getSubscriptionDisplayName(subscriptionTier)}
                </Badge>
                {getSubscriptionStatusBadge(subscriptionStatus)}
                <Badge variant="outline">
                  <Calendar className="mr-1 h-3 w-3" />
                  Joined {formatDate(user.created_at || new Date().toISOString())}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {subscriptionTier === 'free' && (
                <Button asChild className="bg-amber hover:bg-amber-dark text-background">
                  <Link href="/subscription">Upgrade to Premium</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Edit Forms */}
          <div className="lg:col-span-2">
            <ProfileForm user={user} />
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Subscription Card */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="h-5 w-5 text-amber" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/50 bg-background/50 p-4">
                  <div className="space-y-3">
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">
                        {getSubscriptionDisplayName(subscriptionTier)}
                      </h3>
                      <div className="mt-2 flex justify-center">
                        {getSubscriptionStatusBadge(subscriptionStatus)}
                      </div>
                    </div>
                    
                    {hasActiveSubscription && subscriptionEndDate && (
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expires:</span>
                          <span className="font-medium">
                            {formatDate(subscriptionEndDate)}
                          </span>
                        </div>
                        {subscriptionTier === 'member' && subscriptionStatus === 'active' && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Next billing:</span>
                            <span className="font-medium">
                              {formatDate(subscriptionEndDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {subscriptionTier === 'free' ? (
                      <Button asChild className="mt-4 w-full bg-amber hover:bg-amber-dark text-background">
                        <Link href="/subscription">Upgrade Now</Link>
                      </Button>
                    ) : subscriptionStatus === 'active' ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-muted-foreground text-center">
                          {subscriptionTier === 'member'
                            ? 'Your subscription will automatically renew weekly'
                            : 'Your day pass expires in 3 hours'}
                        </p>
                        {subscriptionTier === 'member' && (
                          <Button 
                            asChild 
                            variant="outline" 
                            className="w-full"
                          >
                            <Link href="/subscription">Manage Subscription</Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button asChild className="mt-4 w-full bg-amber hover:bg-amber-dark text-background">
                        <Link href="/subscription">Renew Subscription</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reading History Card */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-amber" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {readingHistory.length === 0 ? (
                  <div className="text-center py-4">
                    <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No reading history yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readingHistory.slice(0, 3).map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="truncate">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(item.lastRead)}
                          </p>
                        </div>
                        <span className="text-amber font-medium ml-2">
                          {item.progress}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                  <LogOut className="h-5 w-5" />
                  Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SignOutButton />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
