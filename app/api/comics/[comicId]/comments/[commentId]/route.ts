import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ comicId: string; commentId: string }>
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { comicId, commentId } = await context.params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment content must be less than 2000 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the comment and verify ownership
    const { data: comment, error: commentError } = await supabase
      .from('comic_comments')
      .select('id, user_id, comic_id')
      .eq('id', commentId)
      .eq('comic_id', comicId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 }
      )
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
          email
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    // Transform the data to flatten the profile relationship
    const commentWithUser = {
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
      },
    }

    return NextResponse.json({ data: commentWithUser })
  } catch (error: any) {
    console.error('Error in PUT /api/comics/[comicId]/comments/[commentId]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { comicId, commentId } = await context.params

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the comment and verify ownership
    const { data: comment, error: commentError } = await supabase
      .from('comic_comments')
      .select('id, user_id, comic_id')
      .eq('id', commentId)
      .eq('comic_id', comicId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      )
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from('comic_comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/comics/[comicId]/comments/[commentId]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
