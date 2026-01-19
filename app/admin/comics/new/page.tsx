import { AdminLayout } from '@/components/admin/AdminLayout'
import { ComicForm } from '@/components/admin/ComicForm'

export default function NewComicPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Comic</h1>
          <p className="text-muted-foreground">Fill in the details to create a new comic</p>
        </div>
        <ComicForm />
      </div>
    </AdminLayout>
  )
}

