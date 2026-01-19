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
} from 'lucide-react'
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

export function ComicReader({ comic, pages, currentPageIndex: initialPageIndex }: ComicReaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useState(initialPageIndex)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [readingMode, setReadingMode] = useState<ReadingMode>('vertical')
  const horizontalContainerRef = useRef<HTMLDivElement>(null)
  const verticalContainerRef = useRef<HTMLDivElement>(null)
  const currentPageRef = useRef(currentPage)
  const totalPagesRef = useRef(pages.length)

  // Keep refs in sync with state
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  useEffect(() => {
    totalPagesRef.current = pages.length
  }, [pages.length])

  const totalPages = pages.length
  const currentPageData = pages[currentPage]

  // Update URL when page changes
  useEffect(() => {
    const newPage = currentPage + 1
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.replace(`/comics/read/${comic.id}?${params.toString()}`, { scroll: false })
  }, [currentPage, comic.id, router, searchParams])

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
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
      setImageError(false)
    }
  }

  const goToPage = (pageNumber: number) => {
    const pageIndex = Math.max(0, Math.min(pageNumber - 1, totalPages - 1))
    setCurrentPage(pageIndex)
    setImageError(false)
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
      if (page < total - 1) {
        setCurrentPage(page + 1)
        setImageError(false)
      }
    } else if (e.key === 'f') {
      toggleFullscreen()
    } else if (e.key === 'Escape') {
      setShowControls(true)
    } else if (e.key === 'r' || e.key === 'R') {
      setReadingMode((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))
    }
  }, [])

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
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={`relative w-full max-w-4xl transition-opacity ${
                  index === currentPage ? 'opacity-100' : 'opacity-60'
                }`}
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
                      className="object-contain cursor-pointer"
                      priority={index === initialPageIndex}
                      onClick={() => {
                        setCurrentPage(index)
                        setImageError(false)
                      }}
                      onError={() => {
                        if (index === currentPage) {
                          setImageError(true)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
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
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={`relative flex-shrink-0 transition-opacity ${
                  index === currentPage ? 'opacity-100' : 'opacity-60'
                }`}
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
                      className="object-contain cursor-pointer"
                      priority={index === initialPageIndex}
                      onClick={() => {
                        setCurrentPage(index)
                        setImageError(false)
                      }}
                      onError={() => {
                        if (index === currentPage) {
                          setImageError(true)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-white/20">
          <div
            className="h-full bg-amber transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

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
          showControls ? 'opacity-100' : 'opacity-0'
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
