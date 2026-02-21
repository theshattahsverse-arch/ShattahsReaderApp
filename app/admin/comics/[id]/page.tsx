import { notFound } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ComicForm } from '@/components/admin/ComicForm'
import { PageUploader } from '@/components/admin/PageUploader'
import { CharacterManager } from '@/components/admin/CharacterManager'
import { getComicById } from '@/lib/admin-actions'
import { Separator } from '@/components/ui/separator'

interface ComicEditPageProps {
  params: Promise<{ id: string }>
}

export default async function ComicEditPage({ params }: ComicEditPageProps) {
  const { id } = await params
  const { data: comic, error } = await getComicById(id)

  if (error || !comic) {
    notFound()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Comic</h1>
          <p className="text-muted-foreground">Update comic details and manage pages</p>
        </div>

        <ComicForm comic={comic} />

        <Separator />

        <div>
          <h2 className="mb-4 text-2xl font-bold">Manage Pages</h2>
          <PageUploader comicId={id} />
        </div>

        <Separator />

        <div>
          <h2 className="mb-4 text-2xl font-bold">Manage Characters</h2>
          <CharacterManager comicId={id} />
        </div>
      </div>
    </AdminLayout>
  )
}

