'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Send, Edit2, Trash2, X } from 'lucide-react'
import type { CommentWithUser } from '@/types/database'
import Link from 'next/link'

interface CommentSidebarProps {
  comicId: string
  currentPageId: string | null
  currentPageNumber: number
  isVisible: boolean
  onClose: () => void
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
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`
}

export function CommentSidebar({ comicId, currentPageId, currentPageNumber, isVisible, onClose }: CommentSidebarProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [commentContent, setCommentContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // const [commentMode, setCommentMode] = useState<'page' | 'comic'>('page')
  const commentMode = 'comic' // Only comic-level comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  // const [showAllComments, setShowAllComments] = useState(false) // Commented out - only comic comments
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const commentsContainerRef = useRef<HTMLDivElement>(null)

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

  // Fetch initial comments
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      // Only fetch comic-level comments (no page_id filter)
      const url = `/api/comics/${comicId}/comments`
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        console.error('Error fetching comments:', data.error)
        return
      }

      // Sort by created_at descending (newest first)
      const sortedComments = (data.data || []).sort((a: CommentWithUser, b: CommentWithUser) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setComments(sortedComments)
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [comicId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comic-comments-${comicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comic_comments',
          filter: `comic_id=eq.${comicId}`,
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
  }, [comicId, fetchComments])

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > 0 && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments.length])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !commentContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Only comic-level comments (no page_id)
      const response = await fetch(`/api/comics/${comicId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentContent.trim(),
          page_id: null, // Always null for comic-level comments
        }),
      })

      const data = await response.json()

      if (data.error) {
        console.error('Error creating comment:', data.error)
        alert('Failed to post comment: ' + data.error)
        return
      }

      setCommentContent('')
      // Comments will be updated via real-time subscription
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const response = await fetch(`/api/comics/${comicId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      })

      const data = await response.json()

      if (data.error) {
        console.error('Error updating comment:', data.error)
        alert('Failed to update comment: ' + data.error)
        return
      }

      setEditingCommentId(null)
      setEditContent('')
      // Comments will be updated via real-time subscription
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Failed to update comment')
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
        alert('Failed to delete comment: ' + data.error)
        return
      }

      // Comments will be updated via real-time subscription
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  // Only show comic-level comments (page_id is null)
  const displayedComments = comments.filter((comment) => comment.page_id === null)

  if (!isVisible) return null

  return (
    <div className="fixed right-0 top-0 h-screen w-[380px] bg-black/95 backdrop-blur-md border-l border-white/20 shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Comments</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Page/All toggle commented out - only comic comments */}
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllComments(!showAllComments)}
              className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
            >
              {showAllComments ? 'Page' : 'All'}
            </Button> */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Page indicator commented out - only comic comments */}
        {/* {!showAllComments && currentPageId && (
          <p className="text-xs text-white/60">Page {currentPageNumber}</p>
        )} */}
      </div>

      {/* Comments List */}
      <div
        ref={commentsContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {isLoading ? (
          <div className="text-center text-white/60 py-8">Loading comments...</div>
        ) : displayedComments.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
            <p className="text-xs mt-1">Be the first to comment!</p>
          </div>
        ) : (
          displayedComments.map((comment) => {
            const isOwnComment = user && comment.user_id === user.id
            const isEditing = editingCommentId === comment.id

            return (
              <div
                key={comment.id}
                className="bg-white/5 rounded-lg p-3 border border-white/10 animate-in fade-in slide-in-from-bottom-2"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber/50"
                      rows={3}
                      placeholder="Edit your comment..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditComment(comment.id)}
                        className="bg-amber hover:bg-amber/90 text-black text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null)
                          setEditContent('')
                        }}
                        className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 border border-white/20">
                        <AvatarImage src={comment.user.avatar_url || undefined} />
                        <AvatarFallback className="bg-amber/20 text-amber text-xs">
                          {comment.user.full_name?.charAt(0)?.toUpperCase() ||
                            comment.user.email?.charAt(0)?.toUpperCase() ||
                            'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white">
                            {comment.user.full_name || comment.user.email || 'Anonymous'}
                          </p>
                          <span className="text-xs text-white/40">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-white/90 whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                        {/* Page indicator commented out - only comic comments */}
                        {/* {comment.page_id && comment.page_id !== currentPageId && (
                          <p className="text-xs text-amber/70 mt-1">
                            Page {comment.page_id ? 'comment' : ''}
                          </p>
                        )} */}
                      </div>
                      {isOwnComment && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCommentId(comment.id)
                              setEditContent(comment.content)
                            }}
                            className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="h-6 w-6 p-0 text-white/60 hover:text-red-500 hover:bg-white/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      <Separator className="bg-white/10" />

      {/* Comment Input */}
      <div className="p-4 border-t border-white/10">
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="space-y-3">
            {/* Page/Comic toggle commented out - only comic comments */}
            {/* <div className="flex gap-2">
              {currentPageId && (
                <Button
                  type="button"
                  size="sm"
                  variant={commentMode === 'page' ? 'default' : 'outline'}
                  onClick={() => setCommentMode('page')}
                  className={`text-xs ${commentMode === 'page' ? 'bg-amber hover:bg-amber/90 text-black' : 'text-white/70 border-white/20 hover:bg-white/10'}`}
                >
                  Page {currentPageNumber}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant={commentMode === 'comic' ? 'default' : 'outline'}
                onClick={() => setCommentMode('comic')}
                className={`text-xs ${commentMode === 'comic' ? 'bg-amber hover:bg-amber/90 text-black' : 'text-white/70 border-white/20 hover:bg-white/10'}`}
              >
                Comic
              </Button>
            </div> */}
            <div className="flex gap-2">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Comment on this comic..."
                className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber/50 placeholder:text-white/40"
                rows={3}
                maxLength={2000}
              />
            </div>
            <Button
              type="submit"
              disabled={!commentContent.trim() || isSubmitting}
              className="w-full bg-amber hover:bg-amber/90 text-black"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-white/70 mb-3">Sign in to comment</p>
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
