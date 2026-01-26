import { Suspense } from 'react'
import { ComicGrid } from '@/components/comics/ComicGrid'
import { getAllComics } from '@/lib/comic-actions'
import { ComicsPageContent } from './ComicsPageContent'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Comics',
  description: 'Browse all comics available on ShattahsVerse',
}

export default async function ComicsPage() {
  const { data: comics } = await getAllComics()

  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              All Comics
            </h1>
            <p className="mt-2 text-muted-foreground">
              Discover amazing stories from the multiverse
            </p>
          </div>
        </div>
      </div>
    }>
      <ComicsPageContent comics={comics || []} />
    </Suspense>
  )
}

