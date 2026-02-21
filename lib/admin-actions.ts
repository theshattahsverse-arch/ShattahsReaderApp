'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { uploadComicCover, uploadArtistPicture, deleteComicFile } from '@/lib/storage-actions'
import type { ComicStatus } from '@/types/database'

/**
 * Check if current user is an admin
 */
export async function checkAdminStatus(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return false
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    return profile?.is_admin === true
  } catch {
    return false
  }
}

/**
 * Get admin profile
 */
export async function getAdminProfile() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return null
    }

    return profile
  } catch {
    return null
  }
}

/**
 * Admin sign in
 */
export async function adminSignIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Login failed' }
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single()

  if (!profile?.is_admin) {
    await supabase.auth.signOut()
    return { error: 'Access denied: Admin privileges required' }
  }

  revalidatePath('/', 'layout')
  redirect('/admin/dashboard')
}

/**
 * Admin sign out
 */
export async function adminSignOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/admin/login')
}

/**
 * Get all comics (for admin dashboard)
 */
export async function getAllComics() {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized', data: null }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comics')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { error: error.message, data: null }
    }

    return { error: null, data }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch comics', data: null }
  }
}

/**
 * Get comic by ID
 */
export async function getComicById(comicId: string) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized', data: null }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comics')
      .select('*')
      .eq('id', comicId)
      .single()

    if (error) {
      return { error: error.message, data: null }
    }

    return { error: null, data }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch comic', data: null }
  }
}

/**
 * Get comic pages
 */
export async function getComicPages(comicId: string) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized', data: null }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('comic_pages')
      .select('*')
      .eq('comic_id', comicId)
      .order('page_number', { ascending: true })

    if (error) {
      return { error: error.message, data: null }
    }

    return { error: null, data }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch pages', data: null }
  }
}

/**
 * Create new comic
 */
export async function createComic(formData: FormData) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required', data: null }
    }

    const supabase = await createClient()

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const author = formData.get('author') as string
    const genreString = formData.get('genre') as string
    const status = formData.get('status') as ComicStatus
    const isPremium = formData.get('is_premium') === 'true'
    const coverFile = formData.get('cover')
    const writtenBy = formData.get('written_by') as string
    const coverArt = formData.get('cover_art') as string
    const interiorArtLines = formData.get('interior_art_lines') as string
    const interiorArtColors = formData.get('interior_art_colors') as string

    if (!title) {
      return { error: 'Title is required', data: null }
    }

    // Parse genres
    const genre = genreString
      ? genreString.split(',').map(g => g.trim()).filter(g => g.length > 0)
      : []

    // Create comic record
    const { data: comic, error: comicError } = await supabase
      .from('comics')
      .insert({
        title,
        description: description || null,
        author: author || null,
        genre: genre.length > 0 ? genre : null,
        status: status || 'Ongoing',
        is_premium: isPremium,
        written_by: writtenBy || null,
        cover_art: coverArt || null,
        interior_art_lines: interiorArtLines || null,
        interior_art_colors: interiorArtColors || null,
      })
      .select()
      .single()

    if (comicError) {
      return { error: comicError.message, data: null }
    }

    // Upload cover image if provided
    if (coverFile) {
      // Check if it's a File object
      if (coverFile instanceof File && coverFile.size > 0) {
        console.log('Uploading cover file:', {
          name: coverFile.name,
          size: coverFile.size,
          type: coverFile.type
        })
        
        const coverResult = await uploadComicCover(comic.id, coverFile)
        console.log('Cover upload result:', coverResult)
        
        if (coverResult.success && coverResult.path) {
          // Update comic with cover path
          const { error: updateError } = await supabase
            .from('comics')
            .update({ cover_image_path: coverResult.path })
            .eq('id', comic.id)
          
          if (updateError) {
            console.error('Failed to update cover path:', updateError)
            return { error: `Comic created but cover upload failed: ${updateError.message}`, data: comic }
          } else {
            // Update the returned comic data with the cover path
            comic.cover_image_path = coverResult.path
          }
        } else if (coverResult.error) {
          console.error('Failed to upload cover:', coverResult.error)
          return { error: `Comic created but cover upload failed: ${coverResult.error}`, data: comic }
        }
      } else {
        console.log('Cover file is not a valid File object:', {
          isFile: coverFile instanceof File,
          type: typeof coverFile,
          size: coverFile instanceof File ? coverFile.size : 'N/A'
        })
      }
    }

    revalidatePath('/admin/dashboard')
    return { error: null, data: comic }
  } catch (error: any) {
    return { error: error.message || 'Failed to create comic', data: null }
  }
}

/**
 * Update comic
 */
export async function updateComic(comicId: string, formData: FormData) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required', data: null }
    }

    const supabase = await createClient()

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const author = formData.get('author') as string
    const genreString = formData.get('genre') as string
    const status = formData.get('status') as ComicStatus
    const isPremium = formData.get('is_premium') === 'true'
    const coverFile = formData.get('cover')
    const writtenBy = formData.get('written_by') as string
    const coverArt = formData.get('cover_art') as string
    const interiorArtLines = formData.get('interior_art_lines') as string
    const interiorArtColors = formData.get('interior_art_colors') as string

    if (!title) {
      return { error: 'Title is required', data: null }
    }

    // Parse genres
    const genre = genreString
      ? genreString.split(',').map(g => g.trim()).filter(g => g.length > 0)
      : []

    const updateData: any = {
      title,
      description: description || null,
      author: author || null,
      genre: genre.length > 0 ? genre : null,
      status: status || 'Ongoing',
      is_premium: isPremium,
      written_by: writtenBy || null,
      cover_art: coverArt || null,
      interior_art_lines: interiorArtLines || null,
      interior_art_colors: interiorArtColors || null,
    }

    // Upload new cover if provided
    if (coverFile && coverFile instanceof File && coverFile.size > 0) {
      const coverResult = await uploadComicCover(comicId, coverFile)
      if (coverResult.success && coverResult.path) {
        updateData.cover_image_path = coverResult.path
      } else if (coverResult.error) {
        console.error('Failed to upload cover:', coverResult.error)
        // Continue with update even if cover upload fails
      }
    }

    const { data: comic, error } = await supabase
      .from('comics')
      .update(updateData)
      .eq('id', comicId)
      .select()
      .single()

    if (error) {
      return { error: error.message, data: null }
    }

    revalidatePath('/admin/dashboard')
    revalidatePath(`/admin/comics/${comicId}`)
    return { error: null, data: comic }
  } catch (error: any) {
    return { error: error.message || 'Failed to update comic', data: null }
  }
}

/**
 * Delete comic page
 */
export async function deleteComicPage(pageId: string, imagePath: string) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required' }
    }

    const supabase = await createClient()

    // Get comic_id before deletion
    const { data: page } = await supabase
      .from('comic_pages')
      .select('comic_id')
      .eq('id', pageId)
      .single()

    const comicId = page?.comic_id

    // Delete from database first
    const { error: dbError } = await supabase
      .from('comic_pages')
      .delete()
      .eq('id', pageId)

    if (dbError) {
      return { error: dbError.message }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('comics')
      .remove([imagePath])

    if (storageError) {
      // Log error but don't fail - file might already be deleted
      console.warn('Failed to delete file from storage:', storageError.message)
    }

    if (comicId) {
      revalidatePath(`/admin/comics/${comicId}`)
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete page' }
  }
}

/**
 * Delete comic
 */
export async function deleteComic(comicId: string) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required' }
    }

    const supabase = await createClient()

    // Get all pages to delete from storage
    const { data: pages } = await supabase
      .from('comic_pages')
      .select('image_path')
      .eq('comic_id', comicId)

    // Get cover path
    const { data: comic } = await supabase
      .from('comics')
      .select('cover_image_path')
      .eq('id', comicId)
      .single()

    // Delete files from storage
    const filesToDelete: string[] = []
    if (comic?.cover_image_path) {
      filesToDelete.push(comic.cover_image_path)
    }
    if (pages) {
      pages.forEach(page => {
        if (page.image_path) {
          filesToDelete.push(page.image_path)
        }
      })
    }

    if (filesToDelete.length > 0) {
      await supabase.storage
        .from('comics')
        .remove(filesToDelete)
    }

    // Delete comic (cascade will delete pages)
    const { error } = await supabase
      .from('comics')
      .delete()
      .eq('id', comicId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/dashboard')
    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete comic' }
  }
}

// ---------------------------------------------------------------------------
// Artists (admin CRUD)
// ---------------------------------------------------------------------------

export type ArtistWithComic = Awaited<ReturnType<typeof getAllArtists>>['data'] extends (infer T)[] | null ? T : never

/**
 * Get all artists (admin), with optional comic title
 */
export async function getAllArtists() {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized', data: null }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('artists')
      .select(`
        *,
        comics(title)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return { error: error.message, data: null }
    }

    return { error: null, data }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch artists', data: null }
  }
}

/**
 * Get artist by ID (admin)
 */
export async function getArtistById(artistId: string) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized', data: null }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single()

    if (error) {
      return { error: error.message, data: null }
    }

    return { error: null, data }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch artist', data: null }
  }
}

/**
 * Get artists by comic ID (admin, e.g. for dropdowns)
 */
export async function getArtistsByComicId(comicId: string) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized', data: null }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('comic_id', comicId)
      .order('name', { ascending: true })

    if (error) {
      return { error: error.message, data: null }
    }

    return { error: null, data }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch artists', data: null }
  }
}

/**
 * Create artist
 */
export async function createArtist(formData: FormData) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required', data: null }
    }

    const supabase = await createClient()

    const name = formData.get('name') as string
    const title = (formData.get('title') as string) || null
    const bio = (formData.get('bio') as string) || null
    const hyperlink = (formData.get('hyperlink') as string) || null
    const comicIdRaw = formData.get('comic_id') as string
    const comic_id = comicIdRaw && comicIdRaw !== '' ? comicIdRaw : null
    const social_handle = (formData.get('social_handle') as string) || null
    const pictureFile = formData.get('picture') as File | null

    if (!name?.trim()) {
      return { error: 'Name is required', data: null }
    }

    const { data: artist, error: insertError } = await supabase
      .from('artists')
      .insert({
        name: name.trim(),
        title: title?.trim() || null,
        bio: bio?.trim() || null,
        hyperlink: hyperlink?.trim() || null,
        comic_id,
        social_handle: social_handle?.trim() || null,
      })
      .select()
      .single()

    if (insertError) {
      return { error: insertError.message, data: null }
    }

    if (pictureFile && pictureFile instanceof File && pictureFile.size > 0) {
      const uploadResult = await uploadArtistPicture(artist.id, pictureFile)
      if (uploadResult.success && uploadResult.path) {
        await supabase
          .from('artists')
          .update({ picture_path: uploadResult.path })
          .eq('id', artist.id)
        artist.picture_path = uploadResult.path
      }
    }

    revalidatePath('/admin/artists')
    revalidatePath('/admin/dashboard')
    return { error: null, data: artist }
  } catch (error: any) {
    return { error: error.message || 'Failed to create artist', data: null }
  }
}

/**
 * Update artist
 */
export async function updateArtist(artistId: string, formData: FormData) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required', data: null }
    }

    const supabase = await createClient()

    const name = formData.get('name') as string
    const title = (formData.get('title') as string) || null
    const bio = (formData.get('bio') as string) || null
    const hyperlink = (formData.get('hyperlink') as string) || null
    const comicIdRaw = formData.get('comic_id') as string
    const comic_id = comicIdRaw && comicIdRaw !== '' ? comicIdRaw : null
    const social_handle = (formData.get('social_handle') as string) || null
    const pictureFile = formData.get('picture') as File | null

    if (!name?.trim()) {
      return { error: 'Name is required', data: null }
    }

    const { data: existing } = await supabase
      .from('artists')
      .select('picture_path')
      .eq('id', artistId)
      .single()

    const updateData: Record<string, unknown> = {
      name: name.trim(),
      title: title?.trim() || null,
      bio: bio?.trim() || null,
      hyperlink: hyperlink?.trim() || null,
      comic_id,
      social_handle: social_handle?.trim() || null,
    }

    if (pictureFile && pictureFile instanceof File && pictureFile.size > 0) {
      const uploadResult = await uploadArtistPicture(artistId, pictureFile)
      if (uploadResult.success && uploadResult.path) {
        updateData.picture_path = uploadResult.path
        if (existing?.picture_path && existing.picture_path !== uploadResult.path) {
          await deleteComicFile(existing.picture_path)
        }
      }
    }

    const { data: artist, error } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', artistId)
      .select()
      .single()

    if (error) {
      return { error: error.message, data: null }
    }

    revalidatePath('/admin/artists')
    revalidatePath(`/admin/artists/${artistId}`)
    return { error: null, data: artist }
  } catch (error: any) {
    return { error: error.message || 'Failed to update artist', data: null }
  }
}

/**
 * Delete artist
 */
export async function deleteArtist(artistId: string) {
  try {
    const isAdmin = await checkAdminStatus()
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required' }
    }

    const supabase = await createClient()

    const { data: artist } = await supabase
      .from('artists')
      .select('picture_path')
      .eq('id', artistId)
      .single()

    if (artist?.picture_path) {
      await deleteComicFile(artist.picture_path)
    }

    const { error } = await supabase
      .from('artists')
      .delete()
      .eq('id', artistId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/artists')
    revalidatePath('/admin/dashboard')
    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete artist' }
  }
}

