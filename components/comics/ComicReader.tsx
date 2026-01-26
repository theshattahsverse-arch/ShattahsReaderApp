'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  List,
  Maximize,
  Minimize,
  LayoutGrid,
  LayoutList,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SubscriptionGateDialog } from './SubscriptionGateDialog'
import { PageComments } from './PageComments'
import { CommentSidebar } from './CommentSidebar'
import type { Comic } from '@/types/database'

interface PageWithUrl {
  id: string
  page_number: number
  image_url: string | null
}

interface ComicReaderProps {
  comic: Comic & { cover_image_url: string | null }
  pages: PageWithUrl[]
  currentPageIndex: number
}

type ReadingMode = 'vertical' | 'horizontal'

const FREE_PAGE_LIMIT = 4 // Users can access pages 0-3 (pages 1-4)

export function ComicReader({ comic, pages, currentPageIndex: initialPageIndex }: ComicReaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useState(initialPageIndex)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [readingMode, setReadingMode] = useState<ReadingMode>('vertical')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const [showCommentSidebar, setShowCommentSidebar] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const horizontalContainerRef = useRef<HTMLDivElement>(null)
  const verticalContainerRef = useRef<HTMLDivElement>(null)
  const currentPageRef = useRef(currentPage)
  const totalPagesRef = useRef(pages.length)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  // Check authentication and subscription status
  const checkAuthAndSubscription = useCallback(async (retryCount = 0) => {
    try {
      setIsCheckingAuth(true)
      const supabase = createClient()
      
      // Wait a bit if this is a retry to allow cookies to be set
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount))
      }
      
      // Try to get session first (more reliable after redirect)
      const { data: { session } } = await supabase.auth.getSession()
      
      // If no session, try getUser as fallback
      let user = session?.user
      if (!user) {
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser()
        if (userError || !userData) {
          // User is not authenticated - check for anonymous Day Pass
          setIsAuthenticated(false)
          try {
            const response = await fetch('/api/subscription/check-anonymous', {
              credentials: 'include', // Include cookies in the request
            })
            const data = await response.json()
            setHasActiveSubscription(data.hasActiveDayPass || false)
          } catch (error) {
            console.error('Error checking anonymous Day Pass:', error)
            setHasActiveSubscription(false)
          }
          setIsCheckingAuth(false)
          return
        }
        user = userData
      }
      
      if (!user) {
        // User is not authenticated - check for anonymous Day Pass
        setIsAuthenticated(false)
        try {
          const response = await fetch('/api/subscription/check-anonymous', {
            credentials: 'include', // Include cookies in the request
          })
          const data = await response.json()
          setHasActiveSubscription(data.hasActiveDayPass || false)
        } catch (error) {
          console.error('Error checking anonymous Day Pass:', error)
          setHasActiveSubscription(false)
        }
        setIsCheckingAuth(false)
        return
      }

      setIsAuthenticated(true)

      // Check subscription status
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        setHasActiveSubscription(false)
        setIsCheckingAuth(false)
        return
      }

      // Check if subscription is active and not expired
      const subscriptionStatus = (profile as any).subscription_status
      const subscriptionEndDate = (profile as any).subscription_end_date

      if (subscriptionStatus === 'active' && subscriptionEndDate) {
        const endDate = new Date(subscriptionEndDate)
        const now = new Date()
        setHasActiveSubscription(endDate > now)
      } else {
        setHasActiveSubscription(false)
      }
    } catch (error) {
      console.error('Error checking auth/subscription:', error)
      // Retry once if this is the first attempt
      if (retryCount === 0) {
        setTimeout(() => checkAuthAndSubscription(1), 1000)
        return
      }
      setIsAuthenticated(false)
      setHasActiveSubscription(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }, [])

  useEffect(() => {
    // Initial check immediately
    checkAuthAndSubscription()

    // Also check after delays to catch cases where cookies are still being set after redirect
    // This is especially important for anonymous Day Pass after payment redirect
    const delayedCheck1 = setTimeout(() => {
      checkAuthAndSubscription()
    }, 500)
    
    const delayedCheck2 = setTimeout(() => {
      checkAuthAndSubscription()
    }, 1500)

    // Additional check after 3 seconds for payment redirects
    const delayedCheck3 = setTimeout(() => {
      checkAuthAndSubscription()
    }, 3000)

    // Listen for auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Small delay to ensure session is fully established
        setTimeout(() => {
          checkAuthAndSubscription()
        }, 300)
      }
    })

    // Listen for window focus to refresh auth state when user returns from login
    const handleFocus = () => {
      setTimeout(() => {
        checkAuthAndSubscription()
      }, 300)
    }
    window.addEventListener('focus', handleFocus)

    // Listen for visibility change (when tab becomes visible again)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          checkAuthAndSubscription()
        }, 300)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(delayedCheck1)
      clearTimeout(delayedCheck2)
      clearTimeout(delayedCheck3)
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkAuthAndSubscription])

  // Refresh auth state when dialog opens
  useEffect(() => {
    if (showSubscriptionDialog) {
      // Delay to ensure any redirect has completed
      const timeoutId = setTimeout(() => {
        checkAuthAndSubscription()
      }, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [showSubscriptionDialog, checkAuthAndSubscription])

  // Check if user can access a specific page
  const canAccessPage = useCallback((pageIndex: number): boolean => {
    // Always allow access to free pages (0-3)
    if (pageIndex < FREE_PAGE_LIMIT) {
      return true
    }
    // For pages beyond free limit, require either:
    // 1. Authentication with active subscription, OR
    // 2. Active anonymous Day Pass (hasActiveSubscription can be true even without authentication)
    return hasActiveSubscription
  }, [hasActiveSubscription])

  // Keep refs in sync with state
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  useEffect(() => {
    totalPagesRef.current = pages.length
  }, [pages.length])

  // Check initial page access on mount
  useEffect(() => {
    if (!isCheckingAuth && !canAccessPage(initialPageIndex)) {
      // If user tries to access page 5 directly, show modal but allow them to see it
      if (initialPageIndex === FREE_PAGE_LIMIT) {
        setShowSubscriptionDialog(true)
        // Keep them on page 5 (index 4) so they can see it (blurred/locked)
      } else if (initialPageIndex > FREE_PAGE_LIMIT) {
        // For pages beyond 5, redirect to last free page
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', FREE_PAGE_LIMIT.toString())
        router.replace(`/comics/read/${comic.id}?${params.toString()}`, { scroll: false })
        setCurrentPage(FREE_PAGE_LIMIT - 1)
      }
    }
  }, [isCheckingAuth, initialPageIndex, canAccessPage, comic.id, router, searchParams])

  const totalPages = pages.length
  const currentPageData = pages[currentPage]

  // Update URL when page changes
  useEffect(() => {
    const newPage = currentPage + 1
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.replace(`/comics/read/${comic.id}?${params.toString()}`, { scroll: false })
  }, [currentPage, comic.id, router, searchParams])

  // Check if current page is restricted and show dialog if needed (for navigation methods)
  useEffect(() => {
    if (!isCheckingAuth && !canAccessPage(currentPage) && currentPage >= FREE_PAGE_LIMIT) {
      // Show subscription dialog automatically when user reaches page 5 (index 4)
      setShowSubscriptionDialog(true)
      // Don't scroll back or reset page - let user see the locked page 5
    }
  }, [currentPage, canAccessPage, isCheckingAuth])

  // Scroll to current page based on reading mode
  useEffect(() => {
    if (readingMode === 'horizontal' && horizontalContainerRef.current) {
      const pageElement = horizontalContainerRef.current.children[currentPage] as HTMLElement
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    } else if (readingMode === 'vertical' && verticalContainerRef.current) {
      const pageElement = verticalContainerRef.current.children[currentPage] as HTMLElement
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }
    }
  }, [currentPage, readingMode])

  // Use IntersectionObserver to detect when page 5 (5th picture) enters viewport
  useEffect(() => {
    if (isCheckingAuth) return

    // Page 5 is at index 4 (0-based)
    const page5Index = FREE_PAGE_LIMIT // index 4
    
    // Only observe page 5 if it exists and user can't access it
    if (page5Index >= pages.length || canAccessPage(page5Index)) return

    let observer: IntersectionObserver | null = null
    let timeoutId: NodeJS.Timeout | null = null

    // Wait for the page element to be available (refs are set after render)
    const checkAndObserve = () => {
      const page5Element = pageRefs.current[page5Index]
      if (!page5Element) {
        // Retry after a short delay if element not yet available
        timeoutId = setTimeout(checkAndObserve, 100)
        return
      }

      // Create IntersectionObserver to watch when page 5 enters viewport
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // When page 5 becomes visible (intersecting with viewport)
            if (entry.isIntersecting && !canAccessPage(page5Index)) {
              // Show modal immediately when 5th picture comes into view
              setShowSubscriptionDialog(true)
              // Update current page to reflect what user is viewing
              setCurrentPage(page5Index)
              currentPageRef.current = page5Index
            }
          })
        },
        {
          // Trigger when at least 10% of the page is visible
          threshold: 0.1,
          // Use root margin to trigger slightly before page fully enters
          rootMargin: '0px',
        }
      )

      observer.observe(page5Element)
    }

    checkAndObserve()
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (observer) {
        observer.disconnect()
      }
    }
  }, [isCheckingAuth, canAccessPage, pages.length, readingMode])

  // Hide instructions after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowInstructions(false)
    }, 5000)

    return () => clearTimeout(timeout)
  }, [])

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    const resetTimeout = () => {
      setShowControls(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false)
        }
      }, 3000)
    }

    window.addEventListener('mousemove', resetTimeout)
    window.addEventListener('touchstart', resetTimeout)
    
    return () => {
      window.removeEventListener('mousemove', resetTimeout)
      window.removeEventListener('touchstart', resetTimeout)
      clearTimeout(timeout)
    }
  }, [isFullscreen])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleReadingMode = () => {
    setReadingMode((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))
  }

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      setImageError(false)
    }
  }

  const goToNextPage = () => {
    const nextPage = currentPage + 1
    if (nextPage < totalPages) {
      if (canAccessPage(nextPage)) {
        setCurrentPage(nextPage)
        setImageError(false)
      } else {
        // Show subscription dialog
        setShowSubscriptionDialog(true)
      }
    }
  }

  const goToPage = (pageNumber: number) => {
    const pageIndex = Math.max(0, Math.min(pageNumber - 1, totalPages - 1))
    if (canAccessPage(pageIndex)) {
      setCurrentPage(pageIndex)
      setImageError(false)
    } else {
      // Show subscription dialog
      setShowSubscriptionDialog(true)
    }
  }

  const navigateToPageById = useCallback((pageId: string) => {
    const pageIndex = pages.findIndex(page => page.id === pageId)
    if (pageIndex !== -1) {
      if (canAccessPage(pageIndex)) {
        setCurrentPage(pageIndex)
        setImageError(false)
      } else {
        setShowSubscriptionDialog(true)
      }
    }
  }, [pages, canAccessPage])

  const handlePageClick = (pageIndex: number, e?: React.MouseEvent) => {
    // Stop event propagation to prevent parent onClick from firing
    if (e) {
      e.stopPropagation()
    }
    
    if (canAccessPage(pageIndex)) {
      setCurrentPage(pageIndex)
      setImageError(false)
    } else {
      // Show subscription dialog
      setShowSubscriptionDialog(true)
    }
  }

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') {
      const page = currentPageRef.current
      if (page > 0) {
        setCurrentPage(page - 1)
        setImageError(false)
      }
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      const page = currentPageRef.current
      const total = totalPagesRef.current
      const nextPage = page + 1
      if (nextPage < total) {
        if (canAccessPage(nextPage)) {
          setCurrentPage(nextPage)
          setImageError(false)
        } else {
          setShowSubscriptionDialog(true)
        }
      }
    } else if (e.key === 'f') {
      toggleFullscreen()
    } else if (e.key === 'Escape') {
      setShowControls(true)
    } else if (e.key === 'r' || e.key === 'R') {
      setReadingMode((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))
    }
  }, [canAccessPage])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0

  if (!currentPageData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black">
      {/* Top Controls */}
      <div
        className={`fixed left-0 right-0 top-0 z-50 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back button & Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-white hover:bg-white/10"
            >
              <Link href={`/comics/${comic.id}`}>
                <ChevronLeft className="h-6 w-6" />
              </Link>
            </Button>
            <div>
              <h1 className="text-sm font-semibold text-white line-clamp-1">
                {comic.title}
              </h1>
              <p className="text-xs text-white/70">
                Page {currentPage + 1} of {totalPages}
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCommentSidebar(true)}
              className="text-white hover:bg-white/10"
              title="View all comments"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleReadingMode}
              className="text-white hover:bg-white/10"
              title={`Switch to ${readingMode === 'vertical' ? 'horizontal' : 'vertical'} reading mode (R)`}
            >
              {readingMode === 'vertical' ? (
                <LayoutGrid className="h-5 w-5" />
              ) : (
                <LayoutList className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-white hover:bg-white/10"
            >
              <Link href="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-white hover:bg-white/10"
            >
              <Link href={`/comics/${comic.id}`}>
                <List className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Reader Area */}
      {readingMode === 'vertical' ? (
        <div
          className="min-h-screen overflow-y-auto overflow-x-hidden"
          onClick={() => setShowControls(!showControls)}
        >
          <div 
            className="flex flex-col items-center gap-4 px-4 py-16"
            ref={verticalContainerRef}
          >
            {pages.map((page, index) => {
              const isLocked = !canAccessPage(index)
              // Initialize pageRefs array if needed
              if (!pageRefs.current[index]) {
                pageRefs.current[index] = null
              }
              return (
                <div
                  key={page.id}
                  ref={(el) => {
                    pageRefs.current[index] = el
                  }}
                  className={`relative w-full max-w-4xl transition-opacity ${
                    index === currentPage ? 'opacity-100' : 'opacity-60'
                  } ${isLocked ? 'blur-sm' : ''}`}
                  style={{ aspectRatio: '2/3' }}
                >
                  {!page.image_url ? (
                    <div className="flex aspect-[2/3] w-full items-center justify-center bg-card rounded-lg">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-muted-foreground">
                          Page {index + 1}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Image not available
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[2/3] w-full">
                      <Image
                        src={page.image_url}
                        alt={`Page ${index + 1}`}
                        fill
                        className={`object-contain ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        priority={index === initialPageIndex}
                        onClick={(e) => handlePageClick(index, e)}
                        onError={() => {
                          if (index === currentPage) {
                            setImageError(true)
                          }
                        }}
                      />
                      {/* Page Comments Overlay */}
                      {!isFullscreen && !isLocked && (
                        <PageComments
                          comicId={comic.id}
                          pageId={page.id}
                          pageNumber={index + 1}
                        />
                      )}
                      {isLocked && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg cursor-pointer z-10"
                          onClick={(e) => handlePageClick(index, e)}
                        >
                          <div className="text-center text-white">
                            <p className="text-lg font-semibold">Locked</p>
                            <p className="text-sm">Subscribe to unlock</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div
          className="min-h-screen overflow-x-auto overflow-y-hidden"
          onClick={() => setShowControls(!showControls)}
        >
          <div 
            className="flex h-screen items-center gap-2 px-2 py-16"
            ref={horizontalContainerRef}
          >
            {pages.map((page, index) => {
              const isLocked = !canAccessPage(index)
              // Initialize pageRefs array if needed
              if (!pageRefs.current[index]) {
                pageRefs.current[index] = null
              }
              return (
                <div
                  key={page.id}
                  ref={(el) => {
                    pageRefs.current[index] = el
                  }}
                  className={`relative flex-shrink-0 transition-opacity ${
                    index === currentPage ? 'opacity-100' : 'opacity-60'
                  } ${isLocked ? 'blur-sm' : ''}`}
                  style={{ height: '90vh', aspectRatio: '2/3' }}
                >
                  {!page.image_url ? (
                    <div className="flex h-full w-full items-center justify-center bg-card rounded-lg">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-muted-foreground">
                          Page {index + 1}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Image not available
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-full w-full">
                      <Image
                        src={page.image_url}
                        alt={`Page ${index + 1}`}
                        fill
                        className={`object-contain ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        priority={index === initialPageIndex}
                        onClick={(e) => handlePageClick(index, e)}
                        onError={() => {
                          if (index === currentPage) {
                            setImageError(true)
                          }
                        }}
                      />
                      {/* Page Comments Overlay */}
                      {!isFullscreen && !isLocked && (
                        <PageComments
                          comicId={comic.id}
                          pageId={page.id}
                          pageNumber={index + 1}
                        />
                      )}
                      {isLocked && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg cursor-pointer z-10"
                          onClick={(e) => handlePageClick(index, e)}
                        >
                          <div className="text-center text-white">
                            <p className="text-lg font-semibold">Locked</p>
                            <p className="text-sm">Subscribe to unlock</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subscription Gate Dialog */}
      <SubscriptionGateDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        isAuthenticated={isAuthenticated}
        hasActiveSubscription={hasActiveSubscription}
        currentUrl={`/comics/read/${comic.id}?page=${currentPage + 2}`}
      />

      {/* Comment Sidebar */}
      <CommentSidebar
        comicId={comic.id}
        currentPageId={currentPageData?.id || null}
        currentPageNumber={currentPage + 1}
        isVisible={showCommentSidebar}
        onClose={() => setShowCommentSidebar(false)}
        onNavigateToPage={navigateToPageById}
      />

      {/* Vertical Progress bar */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-1 bg-white/20 z-40 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="w-full bg-amber transition-all duration-300"
          style={{ height: `${progressPercentage}%` }}
        />
      </div>

      {/* Bottom Controls */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >

        <div className="flex items-center justify-between px-4 py-3">
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <span className="min-w-[80px] text-center text-sm text-white">
              {currentPage + 1} / {totalPages}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              className="text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Page slider */}
          <div className="hidden sm:flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={(e) => goToPage(parseInt(e.target.value))}
              className="w-32 accent-amber"
            />
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-xs text-white/70 transition-opacity duration-300 ${
          showInstructions ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="mr-4">← → Navigate</span>
        <span className="mr-4">F Fullscreen</span>
        <span className="mr-4">R Toggle reading mode</span>
        <span>{readingMode === 'vertical' ? 'Click sides to turn pages' : 'Click pages to navigate'}</span>
      </div>
    </div>
  )
}
