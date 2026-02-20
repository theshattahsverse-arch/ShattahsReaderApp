import { AdminLayout } from '@/components/admin/AdminLayout'
import { ArtistForm } from '@/components/admin/ArtistForm'

export default function NewArtistPage() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Add Artist</h1>
        <ArtistForm />
      </div>
    </AdminLayout>
  )
}
