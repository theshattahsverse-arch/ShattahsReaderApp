'use client'

import { useState, useEffect } from 'react'
import { deleteComicPage, getComicPages } from '@/lib/admin-actions'
import { uploadComicPages } from '@/lib/storage-actions'
import { FileUpload } from '@/components/admin/FileUpload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { getStorageUrl } from '@/lib/storage-actions'
import type { ComicPage } from '@/types/database'

interface PageUploaderProps {
  comicId: string
}

export function PageUploader({ comicId }: PageUploaderProps) {
  const [pages, setPages] = useState<ComicPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPages()
  }, [comicId])

  const loadPages = async () => {
    setIsLoading(true)
    const { data, error } = await getComicPages(comicId)
    if (error) {
      setError(error)
    } else if (data) {
      setPages(data)
    }
    setIsLoading(false)
  }

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Upload files sequentially to show progress
      const totalFiles = files.length
      let uploaded = 0

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)

        // Create a single-file array for upload
        const results = await uploadComicPages(comicId, [file])
        
        if (results[0]?.error) {
          throw new Error(results[0].error)
        }

        uploaded++
        setUploadProgress((uploaded / totalFiles) * 100)
      }

      // Reload pages after upload
      await loadPages()
      setUploadProgress(0)
    } catch (err: any) {
      setError(err.message || 'Failed to upload pages')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeletePage = async (pageId: string, imagePath: string) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return
    }

    const { error } = await deleteComicPage(pageId, imagePath)
    if (error) {
      setError(error)
    } else {
      await loadPages()
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Pages</CardTitle>
          <CardDescription>
            Upload comic pages. You can upload multiple pages at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isUploading && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading pages...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <FileUpload
            onFilesSelected={handleFilesSelected}
            accept="image/*"
            multiple={true}
            disabled={isUploading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comic Pages ({pages.length})</CardTitle>
          <CardDescription>Manage your comic pages</CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ImageIcon className="mx-auto mb-4 h-12 w-12" />
              <p>No pages uploaded yet</p>
              <p className="text-sm">Upload pages using the form above</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {pages.map((page) => {
                const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comics/${page.image_path}`
                return (
                  <div
                    key={page.id}
                    className="group relative overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Page ${page.page_number}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-full items-center justify-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePage(page.id, page.image_path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 text-center text-xs text-white">
                      Page {page.page_number}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

