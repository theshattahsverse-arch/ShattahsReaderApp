import { AdminLayout } from '@/components/admin/AdminLayout'
import { ComicList } from '@/components/admin/ComicList'

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <ComicList />
    </AdminLayout>
  )
}

