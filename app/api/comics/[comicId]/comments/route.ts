import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasActiveSubscription } from '@/lib/subscription-actions'
import { getSessionIdFromCookie, hasActiveAnonymousDayPass } from '@/lib/anonymous-daypass'

interface RouteContext {
  params: Promise<{ comicId: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { comicId } = await context.params
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('page_id') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const supabase = await createClient()

    // Verify comic exists
    const { data: comic, error: comicError } = await supabase
      .from('comics')
      .select('id')
      .eq('id', comicId)
      .single()

    if (comicError || !comic) {
      return NextResponse.json(
        { error: 'Comic not found' },
        { status: 404 }
      )
    }

    // Build query
    let query = supabase
      .from('comic_comments')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('comic_id', comicId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by page_id if provided
    if (pageId) {
      // Verify page exists and belongs to comic
      const { data: page, error: pageError } = await supabase
        .from('comic_pages')
        .select('id')
        .eq('id', pageId)
        .eq('comic_id', comicId)
        .single()

      if (pageError || !page) {
        return NextResponse.json(
          { error: 'Page not found or does not belong to this comic' },
          { status: 404 }
        )
      }

      query = query.eq('page_id', pageId)
    } else {
      // If no page_id, show both comic-level (page_id IS NULL) and all page comments
      // For now, we'll show all comments. The frontend can filter if needed.
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // Transform the data to flatten the profile relationship
    const commentsWithUsers = comments?.map((comment: any) => ({
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
    })) || []

    return NextResponse.json({ data: commentsWithUsers })
  } catch (error: any) {
    console.error('Error in GET /api/comics/[comicId]/comments:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { comicId } = await context.params
    const body = await request.json()
    const { content, page_id } = body

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

    // Check if user has active subscription
    const hasSubscription = await hasActiveSubscription(user.id)
    if (!hasSubscription) {
      // Check for anonymous day pass as fallback
      const sessionId = getSessionIdFromCookie(request)
      const hasAnonymousDayPass = sessionId ? await hasActiveAnonymousDayPass(sessionId) : false
      
      if (!hasAnonymousDayPass) {
        return NextResponse.json(
          { error: 'Active subscription required to comment. Please subscribe to continue.' },
          { status: 403 }
        )
      }
    }

    // Verify comic exists
    const { data: comic, error: comicError } = await supabase
      .from('comics')
      .select('id')
      .eq('id', comicId)
      .single()

    if (comicError || !comic) {
      return NextResponse.json(
        { error: 'Comic not found' },
        { status: 404 }
      )
    }

    // If page_id is provided, verify it exists and belongs to the comic
    if (page_id) {
      const { data: page, error: pageError } = await supabase
        .from('comic_pages')
        .select('id')
        .eq('id', page_id)
        .eq('comic_id', comicId)
        .single()

      if (pageError || !page) {
        return NextResponse.json(
          { error: 'Page not found or does not belong to this comic' },
          { status: 404 }
        )
      }
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from('comic_comments')
      .insert({
        user_id: user.id,
        comic_id: comicId,
        page_id: page_id || null,
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
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    // Transform the data to flatten the profile relationship
    const commentWithUser = {
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

    return NextResponse.json({ data: commentWithUser }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/comics/[comicId]/comments:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
