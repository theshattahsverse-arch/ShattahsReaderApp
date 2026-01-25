'use server'

import { createClient } from '@/lib/supabase/server'
import type { CommentWithUser } from '@/types/database'

/**
 * Get comments for a comic with optional page filter
 */
export async function getComicComments(
  comicId: string,
  pageId?: string
): Promise<{ error: string | null; data: CommentWithUser[] | null }> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('comic_comments')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email,
          platform
        )
      `)
      .eq('comic_id', comicId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (pageId) {
      query = query.eq('page_id', pageId)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return { error: error.message, data: null }
    }

    // Transform the data to flatten the profile relationship
    const commentsWithUsers: CommentWithUser[] =
      comments?.map((comment: any) => ({
        id: comment.id,
        user_id: comment.user_id,
        comic_id: comment.comic_id,
        page_id: comment.page_id,
        parent_id: comment.parent_id,
        content: comment.content,
        rating: comment.rating,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: {
          id: comment.profiles?.id,
          full_name: comment.profiles?.full_name,
          avatar_url: comment.profiles?.avatar_url,
          email: comment.profiles?.email,
          platform: comment.profiles?.platform,
        },
      })) || []

    return { error: null, data: commentsWithUsers }
  } catch (error: any) {
    console.error('Error in getComicComments:', error)
    return { error: error.message || 'Failed to fetch comments', data: null }
  }
}

/**
 * Create a new comment
 */
export async function createComment(
  comicId: string,
  content: string,
  pageId?: string
): Promise<{ error: string | null; data: CommentWithUser | null }> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required', data: null }
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return { error: 'Comment content is required', data: null }
    }

    if (content.length > 2000) {
      return { error: 'Comment content must be less than 2000 characters', data: null }
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from('comic_comments')
      .insert({
        user_id: user.id,
        comic_id: comicId,
        page_id: pageId || null,
        content: content.trim(),
      })
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating comment:', insertError)
      return { error: 'Failed to create comment', data: null }
    }

    // Transform the data
    const commentWithUser: CommentWithUser = {
      id: comment.id,
      user_id: comment.user_id,
      comic_id: comment.comic_id,
      page_id: comment.page_id,
      parent_id: comment.parent_id,
      content: comment.content,
      rating: comment.rating,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: {
        id: comment.profiles?.id,
        full_name: comment.profiles?.full_name,
        avatar_url: comment.profiles?.avatar_url,
        email: comment.profiles?.email,
      },
    }

    return { error: null, data: commentWithUser }
  } catch (error: any) {
    console.error('Error in createComment:', error)
    return { error: error.message || 'Failed to create comment', data: null }
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<{ error: string | null; data: CommentWithUser | null }> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required', data: null }
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return { error: 'Comment content is required', data: null }
    }

    if (content.length > 2000) {
      return { error: 'Comment content must be less than 2000 characters', data: null }
    }

    // Verify ownership
    const { data: comment, error: commentError } = await supabase
      .from('comic_comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return { error: 'Comment not found', data: null }
    }

    if (comment.user_id !== user.id) {
      return { error: 'You can only edit your own comments', data: null }
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('comic_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email,
          platform
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return { error: 'Failed to update comment', data: null }
    }

    // Transform the data
    const commentWithUser: CommentWithUser = {
      id: updatedComment.id,
      user_id: updatedComment.user_id,
      comic_id: updatedComment.comic_id,
      page_id: updatedComment.page_id,
      parent_id: updatedComment.parent_id,
      content: updatedComment.content,
      rating: updatedComment.rating,
      created_at: updatedComment.created_at,
      updated_at: updatedComment.updated_at,
      user: {
        id: updatedComment.profiles?.id,
        full_name: updatedComment.profiles?.full_name,
        avatar_url: updatedComment.profiles?.avatar_url,
        email: updatedComment.profiles?.email,
        platform: updatedComment.profiles?.platform,
      },
    }

    return { error: null, data: commentWithUser }
  } catch (error: any) {
    console.error('Error in updateComment:', error)
    return { error: error.message || 'Failed to update comment', data: null }
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string
): Promise<{ error: string | null; success: boolean }> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required', success: false }
    }

    // Verify ownership
    const { data: comment, error: commentError } = await supabase
      .from('comic_comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return { error: 'Comment not found', success: false }
    }

    if (comment.user_id !== user.id) {
      return { error: 'You can only delete your own comments', success: false }
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from('comic_comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return { error: 'Failed to delete comment', success: false }
    }

    return { error: null, success: true }
  } catch (error: any) {
    console.error('Error in deleteComment:', error)
    return { error: error.message || 'Failed to delete comment', success: false }
  }
}
