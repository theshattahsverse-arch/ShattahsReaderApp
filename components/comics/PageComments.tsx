'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import type { CommentWithUser } from '@/types/database'
import Link from 'next/link'

interface PageCommentsProps {
  comicId: string
  pageId: string
  pageNumber: number
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths}mo`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y`
}

export function PageComments({ comicId, pageId, pageNumber }: PageCommentsProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [commentContent, setCommentContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const commentsContainerRef = useRef<HTMLDivElement>(null)
  const [fadingComments, setFadingComments] = useState<Set<string>>(new Set())
  const commentTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const [showCommentInput, setShowCommentInput] = useState(false)

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      setUser(user)
    }
    checkAuth()
  }, [])

  // Fetch initial comments for this page
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      const url = `/api/comics/${comicId}/comments?page_id=${pageId}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        console.error('Error fetching comments:', data.error)
        return
      }

      // Sort by created_at ascending (oldest first, newest at bottom)
      const sortedComments = (data.data || []).sort((a: CommentWithUser, b: CommentWithUser) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      setComments(sortedComments)
      // Reset fade state for all comments when fetching new data
      // Also clear all timers so new ones can be set up
      commentTimersRef.current.forEach((timer) => clearTimeout(timer))
      commentTimersRef.current.clear()
      setFadingComments(new Set())
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [comicId, pageId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Set up real-time subscription for this specific page
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`page-comments-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comic_comments',
          filter: `comic_id=eq.${comicId} AND page_id=eq.${pageId}`,
        },
        (payload) => {
          // Refetch comments when changes occur
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [comicId, pageId, fetchComments])

  // Auto-scroll to bottom (newest comments) when new comments arrive
  useEffect(() => {
    if (comments.length > 0 && commentsContainerRef.current) {
      // Since we're using flex-col-reverse, scroll to 0 to see newest at bottom
      requestAnimationFrame(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = 0
        }
      })
    }
  }, [comments.length])

  // Set up fade-out timers for comments (5 seconds after they appear)
  useEffect(() => {
    // Clear existing timers for comments that are no longer in the list
    const currentCommentIds = new Set(comments.map(c => c.id))
    commentTimersRef.current.forEach((timer, commentId) => {
      if (!currentCommentIds.has(commentId)) {
        clearTimeout(timer)
        commentTimersRef.current.delete(commentId)
      }
    })

    // Set up new timers for comments that don't have one yet
    // Add staggered delay so comments float away one by one
    comments.forEach((comment, index) => {
      if (!commentTimersRef.current.has(comment.id) && !fadingComments.has(comment.id)) {
        // Base delay of 5 seconds, plus staggered delay based on index (0.5s between each)
        const staggeredDelay = 5000 + (index * 500)
        const timer = setTimeout(() => {
          setFadingComments((prev) => new Set(prev).add(comment.id))
        }, staggeredDelay)
        commentTimersRef.current.set(comment.id, timer)
      }
    })

    // Cleanup function
    return () => {
      commentTimersRef.current.forEach((timer) => clearTimeout(timer))
      commentTimersRef.current.clear()
    }
  }, [comments, fadingComments])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !commentContent.trim() || isSubmitting) return

    const contentToSubmit = commentContent.trim()
    setIsSubmitting(true)
    
    // Optimistic update - add comment immediately to local state
    const optimisticComment: CommentWithUser = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      comic_id: comicId,
      page_id: pageId,
      parent_id: null,
      content: contentToSubmit,
      rating: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        email: user.email || null,
      },
    }
    
    setComments((prev) => [...prev, optimisticComment])
      setCommentContent('')
      setShowCommentInput(false) // Hide input after submitting
      
      // Scroll to bottom to show new comment
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = 0
        }
      }, 100)

    try {
      const response = await fetch(`/api/comics/${comicId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToSubmit,
          page_id: pageId, // Always include page_id for page-specific comments
        }),
      })

      const data = await response.json()

      if (data.error) {
        console.error('Error creating comment:', data.error)
        // Remove optimistic comment on error
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
        setCommentContent(contentToSubmit) // Restore content
        return
      }

      // Replace optimistic comment with real one from server
      if (data.data) {
        setComments((prev) => 
          prev.map((c) => c.id === optimisticComment.id ? data.data : c)
        )
      }
      
      // Comments will also be updated via real-time subscription as backup
    } catch (error) {
      console.error('Error submitting comment:', error)
      // Remove optimistic comment on error
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setCommentContent(contentToSubmit) // Restore content
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`/api/comics/${comicId}/comments/${commentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) {
        console.error('Error deleting comment:', data.error)
        return
      }

      // Comments will be updated via real-time subscription
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  return (
    <div className="absolute left-0 right-0 bottom-0 h-1/2 flex flex-col pointer-events-none z-10">
      <div className="flex-1 overflow-hidden flex flex-col pointer-events-auto">
        {/* Comments List - Vertical layout, start from bottom */}
        <div
          ref={commentsContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ display: 'flex', flexDirection: 'column-reverse' }}
          onClick={() => setShowCommentInput(true)}
        >
          {isLoading ? (
            <div className="text-center text-white/80 py-4 text-sm font-medium flex-shrink-0">Loading...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-white/70 py-4 text-sm font-medium flex-shrink-0">
             
            </div>
          ) : (
            comments.map((comment) => {
              const isOwnComment = user && comment.user_id === user.id
              const isFading = fadingComments.has(comment.id)

              return (
                <div
                  key={comment.id}
                  className={`px-3 py-2.5 animate-in fade-in slide-in-from-bottom-2 w-1/2 rounded-lg transition-all duration-[2000ms] ease-out ${
                    isFading ? 'opacity-0 -translate-y-20' : 'opacity-100 translate-y-0'
                  }`}
                  style={{
                    background: 'transparent',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-2 h-full">
                    <Avatar className="h-8 w-8 border-2 border-amber/50 flex-shrink-0 shadow-md">
                      <AvatarImage src={comment.user.avatar_url || undefined} />
                      <AvatarFallback className="bg-amber/50 text-amber font-bold text-sm">
                        {comment.user.full_name?.charAt(0)?.toUpperCase() ||
                          comment.user.email?.charAt(0)?.toUpperCase() ||
                          'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-white leading-tight drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)' }}>
                          {comment.user.full_name || comment.user.email || 'Anonymous'}
                        </p>
                        <span className="text-xs text-white font-medium drop-shadow-md" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-white leading-relaxed break-words drop-shadow-lg line-clamp-3 font-medium" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)' }}>
                        {comment.content}
                      </p>
                    </div>
                    {isOwnComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-white/70 hover:text-red-400 text-base font-bold flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors"
                        title="Delete"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Comment Input */}
        {showCommentInput && (
        <div className="border-t border-white/30 bg-black/95 backdrop-blur-md flex-shrink-0">
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className="px-3 pb-3 pt-3">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-white/30 border-2 border-white/40 rounded-lg px-3 py-2 text-white text-sm font-medium placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber transition-all shadow-lg"
                  maxLength={2000}
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  disabled={!commentContent.trim() || isSubmitting}
                  className="bg-amber hover:bg-amber/90 text-black font-bold h-9 px-3 flex-shrink-0 shadow-lg hover:shadow-xl transition-all"
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="px-3 pb-3 pt-3">
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-2 border-amber/50 text-white hover:bg-amber/20 hover:border-amber font-semibold text-sm h-9 shadow-md"
                >
                  Sign in to comment
                </Button>
              </Link>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
