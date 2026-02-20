'use server'

import { createClient } from '@/lib/supabase/server'
import type { Comic, ComicPage } from '@/types/database'

/**
 * Convert storage path to full URL
 */
function getImageUrl(path: string | null): string | null {
  if (!path) return null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/comics/${path}`
}

/**
 * Get all comics (public) - only premium comics
 */
export async function getAllComics() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comics')
      .select('*')
      .eq('is_premium', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comics:', error)
      return { error: error.message, data: null }
    }

    // Convert image paths to URLs
    const comicsWithUrls = data?.map(comic => ({
      ...comic,
      cover_image_url: getImageUrl(comic.cover_image_path),
    })) || []

    return { error: null, data: comicsWithUrls }
  } catch (error: any) {
    console.error('Error in getAllComics:', error)
    return { error: error.message || 'Failed to fetch comics', data: null }
  }
}

/**
 * Get comic by ID (public)
 */
export async function getComicById(comicId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comics')
      .select('*')
      .eq('id', comicId)
      .single()

    if (error) {
      console.error('Error fetching comic:', error)
      return { error: error.message, data: null }
    }

    if (!data) {
      return { error: 'Comic not found', data: null }
    }

    // Convert image path to URL
    const comicWithUrl = {
      ...data,
      cover_image_url: getImageUrl(data.cover_image_path),
    }

    return { error: null, data: comicWithUrl }
  } catch (error: any) {
    console.error('Error in getComicById:', error)
    return { error: error.message || 'Failed to fetch comic', data: null }
  }
}

/**
 * Get comic pages (public)
 */
export async function getComicPages(comicId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comic_pages')
      .select('*')
      .eq('comic_id', comicId)
      .order('page_number', { ascending: true })

    if (error) {
      console.error('Error fetching pages:', error)
      return { error: error.message, data: null }
    }

    // Convert image paths to URLs
    const pagesWithUrls = data?.map(page => ({
      ...page,
      image_url: getImageUrl(page.image_path),
    })) || []

    return { error: null, data: pagesWithUrls }
  } catch (error: any) {
    console.error('Error in getComicPages:', error)
    return { error: error.message || 'Failed to fetch pages', data: null }
  }
}

/**
 * Get popular comics (top rated) - only premium comics
 */
export async function getPopularComics(limit: number = 4) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comics')
      .select('*')
      .eq('is_premium', true)
      .order('rating', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching popular comics:', error)
      return { error: error.message, data: null }
    }

    // Convert image paths to URLs
    const comicsWithUrls = data?.map(comic => ({
      ...comic,
      cover_image_url: getImageUrl(comic.cover_image_path),
    })) || []

    return { error: null, data: comicsWithUrls }
  } catch (error: any) {
    console.error('Error in getPopularComics:', error)
    return { error: error.message || 'Failed to fetch popular comics', data: null }
  }
}

/**
 * Get artists for a comic (public) - artists where comic_id matches
 */
export async function getArtistsForComic(comicId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      // .eq('comic_id', comicId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching artists:', error)
      return { error: error.message, data: null }
    }

    const artistsWithUrls = (data || []).map((artist) => ({
      ...artist,
      picture_url: getImageUrl(artist.picture_path),
    }))

    return { error: null, data: artistsWithUrls }
  } catch (error: any) {
    console.error('Error in getArtistsForComic:', error)
    return { error: error.message || 'Failed to fetch artists', data: null }
  }
}

/**
 * Get a single page by ID
 */
export async function getPageById(pageId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comic_pages')
      .select('*')
      .eq('id', pageId)
      .single()

    if (error) {
      console.error('Error fetching page:', error)
      return { error: error.message, data: null }
    }

    if (!data) {
      return { error: 'Page not found', data: null }
    }

    // Convert image path to URL
    const pageWithUrl = {
      ...data,
      image_url: getImageUrl(data.image_path),
    }

    return { error: null, data: pageWithUrl }
  } catch (error: any) {
    console.error('Error in getPageById:', error)
    return { error: error.message || 'Failed to fetch page', data: null }
  }
}

