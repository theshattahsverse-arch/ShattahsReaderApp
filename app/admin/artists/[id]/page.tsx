import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ArtistForm } from '@/components/admin/ArtistForm'
import { getArtistById } from '@/lib/admin-actions'
import { ArtistDeleteButton } from '@/components/admin/ArtistDeleteButton'
import { Button } from '@/components/ui/button'

interface ArtistEditPageProps {
  params: Promise<{ id: string }>
}

export default async function ArtistEditPage({ params }: ArtistEditPageProps) {
  const { id } = await params
  const { data: artist, error } = await getArtistById(id)

  if (error || !artist) {
    notFound()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Artist</h1>
          <p className="text-muted-foreground">Update artist details and picture</p>
        </div>

        <ArtistForm artist={artist} />

        <div className="flex items-center justify-between border-t border-border pt-6">
          <ArtistDeleteButton artistId={artist.id} artistName={artist.name} />
          <Link href="/admin/artists">
            <Button variant="outline">Back to Artists</Button>
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}
