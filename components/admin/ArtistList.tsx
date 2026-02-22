'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getAllArtists, deleteArtist, updateArtistVisibility } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Trash2, Loader2, Plus, UserCircle } from 'lucide-react'
import type { Artist } from '@/types/database'

type ArtistRow = Artist & { comics: { title: string } | null }

export function ArtistList() {
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    loadArtists()
  }, [])

  const loadArtists = async () => {
    setIsLoading(true)
    const { data, error } = await getAllArtists()
    if (error) {
      console.error('Failed to load artists:', error)
    } else if (data) {
      setArtists(data as ArtistRow[])
    }
    setIsLoading(false)
  }

  const handleDelete = async (artistId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(artistId)
    const { error } = await deleteArtist(artistId)
    if (error) {
      alert(`Failed to delete artist: ${error}`)
    } else {
      await loadArtists()
    }
    setDeletingId(null)
  }

  const handleVisibilityToggle = async (artistId: string, currentVisible: boolean) => {
    setTogglingId(artistId)
    const { error } = await updateArtistVisibility(artistId, !currentVisible)
    if (error) {
      alert(`Failed to update: ${error}`)
    } else {
      setArtists((prev) =>
        prev.map((a) =>
          a.id === artistId ? { ...a, is_visible: !currentVisible } : a
        )
      )
    }
    setTogglingId(null)
  }

  const pictureUrl = (path: string | null) =>
    path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comics/${path}`
      : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (artists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Artists Yet</CardTitle>
          <CardDescription>Add artists and optionally link them to comics</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/artists/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add First Artist
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
          <h1 className="text-3xl font-bold">Artists</h1>
          <p className="text-muted-foreground">Manage artists and link them to comics</p>
        </div>
        <Link href="/admin/artists/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Artist
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <Card key={artist.id} className="overflow-hidden">
            <div className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-muted">
              {pictureUrl(artist.picture_path) ? (
                <Image
                  src={pictureUrl(artist.picture_path)!}
                  alt={artist.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <UserCircle className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-1">{artist.name}</CardTitle>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Show on site</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={artist.is_visible}
                    disabled={togglingId === artist.id}
                    onClick={() => handleVisibilityToggle(artist.id, artist.is_visible)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      artist.is_visible ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        artist.is_visible ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <CardDescription>
                {artist.comics?.title ? (
                  <span>Linked to: {artist.comics.title}</span>
                ) : (
                  <span className="text-muted-foreground">No comic linked</span>
                )}
                {artist.social_handle && (
                  <div className="mt-1 text-xs">@{artist.social_handle}</div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Link href={`/admin/artists/${artist.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(artist.id, artist.name)}
                  disabled={deletingId === artist.id}
                >
                  {deletingId === artist.id ? (
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
