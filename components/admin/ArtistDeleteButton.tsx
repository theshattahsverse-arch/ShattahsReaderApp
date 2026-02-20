'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteArtist } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface ArtistDeleteButtonProps {
  artistId: string
  artistName: string
}

export function ArtistDeleteButton({ artistId, artistName }: ArtistDeleteButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${artistName}"? This cannot be undone.`)) {
      return
    }
    setIsDeleting(true)
    const { error } = await deleteArtist(artistId)
    if (error) {
      alert(`Failed to delete: ${error}`)
      setIsDeleting(false)
      return
    }
    router.push('/admin/artists')
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 h-4 w-4" />
      )}
      Delete Artist
    </Button>
  )
}
