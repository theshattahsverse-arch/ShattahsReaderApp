'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAllComics, deleteComic } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  Plus
} from 'lucide-react'
import { getStorageUrl } from '@/lib/storage-actions'
import type { Comic } from '@/types/database'

export function ComicList() {
  const [comics, setComics] = useState<Comic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadComics()
  }, [])

  const loadComics = async () => {
    setIsLoading(true)
    const { data, error } = await getAllComics()
    if (error) {
      console.error('Failed to load comics:', error)
    } else if (data) {
      setComics(data)
    }
    setIsLoading(false)
  }

  const handleDelete = async (comicId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(comicId)
    const { error } = await deleteComic(comicId)
    if (error) {
      alert(`Failed to delete comic: ${error}`)
    } else {
      await loadComics()
    }
    setDeletingId(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (comics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Comics Yet</CardTitle>
          <CardDescription>Get started by creating your first comic</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/comics/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Comic
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comics</h1>
          <p className="text-muted-foreground">Manage your comic collection</p>
        </div>
        <Link href="/admin/comics/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Comic
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {comics.map((comic) => (
          <Card key={comic.id} className="overflow-hidden">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
              {comic.cover_image_path ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comics/${comic.cover_image_path}`}
                  alt={comic.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="line-clamp-2">{comic.title}</CardTitle>
                <div className="flex gap-1">
                  {comic.is_premium && (
                    <Badge variant="secondary">Premium</Badge>
                  )}
                  <Badge variant="outline">{comic.status}</Badge>
                </div>
              </div>
              <CardDescription>
                {comic.author && <div>By {comic.author}</div>}
                <div className="mt-1 text-xs">
                  {comic.page_count} page{comic.page_count !== 1 ? 's' : ''}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Link href={`/admin/comics/${comic.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(comic.id, comic.title)}
                  disabled={deletingId === comic.id}
                >
                  {deletingId === comic.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

