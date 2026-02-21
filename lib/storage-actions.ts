'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface UploadResult {
  success: boolean
  path?: string
  error?: string
}

export interface UploadPageResult {
  success: boolean
  pageId?: string
  error?: string
}

/**
 * Validate image file
 */
function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
  }
  return null
}

/**
 * Get file extension from filename or MIME type
 */
function getFileExtension(filename: string, mimeType: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return ext === 'jpg' ? 'jpg' : ext
  }
  // Fallback to MIME type
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Upload comic cover image
 */
export async function uploadComicCover(
  comicId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient()

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Validate file
    const validationError = validateImageFile(file)
    if (validationError) {
      return { success: false, error: validationError }
    }

    const ext = getFileExtension(file.name, file.type)
    const filePath = `comics/${comicId}/cover.${ext}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('comics')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // Provide more helpful error messages
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        return { success: false, error: 'Storage bucket "comics" not found. Please create it in Supabase Storage.' }
      }
      if (uploadError.message.includes('new row violates row-level security') || uploadError.message.includes('permission')) {
        return { 
          success: false, 
          error: 'Storage permission denied. Please check bucket policies in Supabase. The bucket needs INSERT policy for authenticated users.' 
        }
      }
      if (uploadError.message.includes('JWT')) {
        return { 
          success: false, 
          error: 'Authentication error. Please ensure you are logged in as an admin.' 
        }
      }
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    if (!uploadData) {
      return { success: false, error: 'Upload failed: No data returned' }
    }

    return { success: true, path: filePath }
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' }
  }
}

/**
 * Upload artist picture (stored in comics bucket at artists/{artistId}/picture.{ext})
 */
export async function uploadArtistPicture(
  artistId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      return { success: false, error: validationError }
    }

    const ext = getFileExtension(file.name, file.type)
    const filePath = `artists/${artistId}/picture.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('comics')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        return { success: false, error: 'Storage bucket "comics" not found. Please create it in Supabase Storage.' }
      }
      if (uploadError.message.includes('new row violates row-level security') || uploadError.message.includes('permission')) {
        return { success: false, error: 'Storage permission denied. Please check bucket policies in Supabase.' }
      }
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    if (!uploadData) {
      return { success: false, error: 'Upload failed: No data returned' }
    }

    return { success: true, path: filePath }
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' }
  }
}

/**
 * Upload character picture (stored in comics bucket at characters/{characterId}/picture.{ext})
 */
export async function uploadCharacterPicture(
  characterId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      return { success: false, error: validationError }
    }

    const ext = getFileExtension(file.name, file.type)
    const filePath = `characters/${characterId}/picture.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('comics')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        return { success: false, error: 'Storage bucket "comics" not found. Please create it in Supabase Storage.' }
      }
      if (uploadError.message.includes('new row violates row-level security') || uploadError.message.includes('permission')) {
        return { success: false, error: 'Storage permission denied. Please check bucket policies in Supabase.' }
      }
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    if (!uploadData) {
      return { success: false, error: 'Upload failed: No data returned' }
    }

    return { success: true, path: filePath }
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' }
  }
}

/**
 * Upload comic page images
 */
export async function uploadComicPages(
  comicId: string,
  files: File[]
): Promise<UploadPageResult[]> {
  try {
    const supabase = await createClient()

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return files.map(() => ({ success: false, error: 'Not authenticated' }))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return files.map(() => ({ success: false, error: 'Unauthorized: Admin access required' }))
    }

    // Get current max page number for this comic
    const { data: existingPages } = await supabase
      .from('comic_pages')
      .select('page_number')
      .eq('comic_id', comicId)
      .order('page_number', { ascending: false })
      .limit(1)

    let nextPageNumber = existingPages && existingPages.length > 0
      ? existingPages[0].page_number + 1
      : 1

    const results: UploadPageResult[] = []

    // Upload files sequentially to maintain page order
    for (const file of files) {
      // Validate file
      const validationError = validateImageFile(file)
      if (validationError) {
        results.push({ success: false, error: validationError })
        continue
      }

      const ext = getFileExtension(file.name, file.type)
      const filePath = `comics/${comicId}/pages/page-${nextPageNumber}.${ext}`

      try {
        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('comics')
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false, // Don't overwrite existing pages
          })

        if (uploadError) {
          results.push({ success: false, error: uploadError.message })
          continue
        }

        // Create database entry for the page
        const { data: pageData, error: dbError } = await supabase
          .from('comic_pages')
          .insert({
            comic_id: comicId,
            page_number: nextPageNumber,
            image_path: filePath,
          })
          .select('id')
          .single()

        if (dbError) {
          // Delete uploaded file if DB insert fails
          await supabase.storage.from('comics').remove([filePath])
          results.push({ success: false, error: dbError.message })
          continue
        }

        results.push({ success: true, pageId: pageData.id })
        nextPageNumber++
      } catch (error: any) {
        results.push({ success: false, error: error.message || 'Upload failed' })
      }
    }

    revalidatePath(`/admin/comics/${comicId}`)
    return results
  } catch (error: any) {
    return files.map(() => ({ success: false, error: error.message || 'Upload failed' }))
  }
}

/**
 * Delete a file from storage
 */
export async function deleteComicFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const { error } = await supabase.storage
      .from('comics')
      .remove([filePath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Delete failed' }
  }
}

/**
 * Get public URL for a storage file
 */
export async function getStorageUrl(filePath: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = supabase.storage
      .from('comics')
      .getPublicUrl(filePath)
    return data.publicUrl
  } catch {
    return null
  }
}

